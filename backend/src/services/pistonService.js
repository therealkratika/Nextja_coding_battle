const axios = require("axios");

const PISTON_URL =
  process.env.PISTON_URL || "http://localhost:2000/api/v2/execute";

const LANGUAGE_MAP = {
  "C++": {
    language: "c++",
    filename: "main.cpp",
  },

  cpp: {
    language: "c++",
    filename: "main.cpp",
  },

  C: {
    language: "c",
    filename: "main.c",
  },

  Java: {
    language: "java",
    filename: "Solution.java",
  },

  JavaScript: {
    language: "javascript",
    filename: "main.js",
  },

  Python: {
    language: "python",
    filename: "main.py",
  },
};

async function executeCode({
  language,
  code,
  stdin = "",
}) {
  const runtime = LANGUAGE_MAP[language];

  if (!runtime) {
    throw new Error(`Unsupported language: ${language}`);
  }

  if (code === undefined || code === null) {
    throw new Error("Code is required.");
  }

  try {
    const response = await axios.post(
      PISTON_URL,
      {
        language: runtime.language,
        version: "*",

        files: [
          {
            name: runtime.filename,
            content: code,
          },
        ],

        stdin,
      },
      {
        headers: process.env.PISTON_API_KEY
          ? {
              Authorization: process.env.PISTON_API_KEY,
            }
          : undefined,

        timeout: 30000,
      }
    );

    const result = response.data;

    if (!result || typeof result !== "object") {
      throw new Error(
        "Piston returned an invalid execution response."
      );
    }

    const compile = result.compile;
    const run = result.run;

    /*
     * ============================
     * COMPILATION ERROR
     * ============================
     */

    if (
      compile &&
      (
        compile.code !== 0 ||
        compile.signal ||
        compile.status
      )
    ) {
      return {
        stdout: "",
        stderr: compile.stderr || "",
        compileOutput:
          compile.stderr ||
          compile.stdout ||
          "Compilation failed",

        status: "Compilation Error",

        executionTime: 0,
        memoryUsed: 0,
      };
    }

    /*
     * ============================
     * NO RUN RESULT
     * ============================
     */

    if (!run) {
      throw new Error(
        "Piston returned no execution result."
      );
    }

    /*
     * ============================
     * RUNTIME ERROR
     * ============================
     */

    if (
      run.code !== 0 ||
      run.signal ||
      run.status
    ) {
      return {
        stdout: run.stdout || "",
        stderr: run.stderr || "",

        compileOutput: "",

        status: "Runtime Error",

        executionTime: Number(
          run.cpu_time || 0
        ),

        memoryUsed: Number(
          ((run.memory || 0) / (1024 * 1024)).toFixed(2)
        ),
      };
    }

    /*
     * ============================
     * SUCCESS
     * ============================
     */

    return {
      stdout: run.stdout || "",
      stderr: run.stderr || "",

      compileOutput: "",

      status: "Completed",

      executionTime: Number(
        run.cpu_time || 0
      ),

      memoryUsed: Number(
        ((run.memory || 0) / (1024 * 1024)).toFixed(2)
      ),
    };
  } catch (error) {
    console.error(
      "Piston Error:",
      error.response?.data || error.message
    );

    const status = error.response?.status;
    const pistonMessage =
      typeof error.response?.data?.message === "string"
        ? error.response.data.message
        : undefined;

    if (status === 401 || status === 403) {
      throw new Error(
        "Piston authorization failed. Check PISTON_API_KEY or PISTON_URL."
      );
    }

    if (status === 404) {
      throw new Error(
        "Piston endpoint was not found. Check PISTON_URL."
      );
    }

    if (
      status === 400 &&
      /runtime is unknown|unknown runtime/i.test(
        pistonMessage || ""
      )
    ) {
      throw new Error(
        `The ${language} runtime is not installed on Piston. Install it on the Piston host with its package manager, or select a language that is installed.`
      );
    }

    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Cannot connect to Piston. Make sure Piston is running."
      );
    }

    if (error.code === "ETIMEDOUT") {
      throw new Error(
        "Piston execution timed out."
      );
    }

    throw new Error(
      pistonMessage ||
      error.message ||
      "Code execution failed."
    );
  }
}

module.exports = {
  executeCode,
};