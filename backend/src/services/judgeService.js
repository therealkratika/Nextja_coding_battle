const { executeCode } = require("./pistonService");

async function judgeSubmission({
  code,
  language,
  question,
  testCases = question.hiddenTestCases || [],
  maxPoints = question.points || 100,
}) {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error("No test cases found.");
  }

  let passedCount = 0;
  let executionTime = 0;
  let memoryUsed = 0;
  const results = [];
  let verdict = "Accepted";
  let stdout = "";
  let stderr = "";

  for (const testCase of testCases) {
    const response = await executeCode({
      language,
      code,
      stdin: testCase.input || "",
    });
    stdout = response.stdout || "";
    stderr = response.stderr || "";
    executionTime = Math.max(
      executionTime,
      Number(response.executionTime || 0)
    );
    memoryUsed = Math.max(memoryUsed, Number(response.memoryUsed || 0));

    if (response.status === "Compilation Error") {
      verdict = "Compilation Error";
      results.push({
        input: testCase.input || "",
        expectedOutput: testCase.expectedOutput || "",
        actualOutput: "",
        passed: false,
        stdout: "",
        stderr: response.compileOutput || response.stderr || "",
      });
      break;
    }

    if (response.status === "Runtime Error") {
      if (verdict !== "Runtime Error") {
        verdict = "Runtime Error";
      }
      results.push({
        input: testCase.input || "",
        expectedOutput: testCase.expectedOutput || "",
        actualOutput: stdout.trim(),
        passed: false,
        stdout,
        stderr,
      });
      continue;
    }

    const actualOutput = stdout.trim();
    const expectedOutput = (testCase.expectedOutput || "").trim();
    const passed = actualOutput === expectedOutput;
    if (passed) {
      passedCount++;
    } else if (verdict === "Accepted") {
      verdict = "Wrong Answer";
    }
    results.push({
      input: testCase.input || "",
      expectedOutput,
      actualOutput,
      passed,
      stdout,
      stderr,
    });
  }

  if (
    passedCount === testCases.length &&
    verdict !== "Compilation Error" &&
    verdict !== "Runtime Error"
  ) {
    verdict = "Accepted";
  }

  const points = Math.round(
    (passedCount / testCases.length) *
      (Number.isFinite(Number(maxPoints)) ? Number(maxPoints) : 100)
  );
  const failedTestCase = results.find((result) => !result.passed) || null;

  return {
    verdict,
    points,
    passedCount,
    totalTests: testCases.length,
    executionTime,
    memoryUsed,
    stdout,
    stderr,
    failedTestCase,
    results,
  };
}

module.exports = {
  judgeSubmission,
};
