const axios = require("axios");

const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";

const LANGUAGE_MAP = {
  "C++": 54,
  C: 50,
  Java: 62,
  JavaScript: 63,
  Python: 71,
};

async function executeCode({ language, code, stdin = "" }) {
  const languageId = LANGUAGE_MAP[language];

  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await axios.post(
      `${JUDGE0_URL}/submissions?wait=true`,
      {
        language_id: languageId,
        source_code: code,
        stdin,
      }
    );

    return {
      stdout: response.data.stdout || "",
      stderr: response.data.stderr || "",
      compileOutput: response.data.compile_output || "",
      status: response.data.status?.description || "",
      executionTime: Number(response.data.time || 0),
      memoryUsed: Number(response.data.memory || 0),
    };
  } catch (error) {
    console.error(
      "Judge0 Error:",
      error.response?.data || error.message
    );

    throw error;
  }
}

module.exports = {
  executeCode,
};