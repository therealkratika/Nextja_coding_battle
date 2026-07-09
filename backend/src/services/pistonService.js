const https = require("https");

const LANGUAGE_MAP = {
  "C++": { language: "cpp", version: "10.2.0" },
  Java: { language: "java", version: "15.0.2" },
  Python: { language: "python", version: "3.10.0" },
  JavaScript: { language: "javascript", version: "18.15.0" },
};

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function executeCode({ language, code, stdin }) {
  const runtime = LANGUAGE_MAP[language];

  if (!runtime) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const payload = {
    language: runtime.language,
    version: runtime.version,
    files: [{ content: code }],
    stdin: stdin || "",
  };

  const response = await postJson("https://emkc.org/api/v2/piston/execute", payload);

  return {
    stdout: response.run?.stdout || "",
    stderr: response.run?.stderr || "",
    exitCode: response.run?.code ?? 0,
    executionTime: response.run?.stats?.wall_time ? Math.round(response.run.stats.wall_time * 1000) : 0,
    memoryUsed: response.run?.stats?.memory ? Math.round(response.run.stats.memory / (1024 * 1024)) : 0,
  };
}

module.exports = { executeCode };
