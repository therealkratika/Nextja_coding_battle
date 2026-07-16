const { executeCode } = require("./judge0Service");

async function judgeSubmission({
  code,
  language,
  question,
}) {
  const hiddenTests = question.hiddenTestCases || [];

  if (hiddenTests.length === 0) {
    throw new Error("No hidden test cases found.");
  }

  let passedCount = 0;
  let executionTime = 0;
  let memoryUsed = 0;

  const results = [];

  let verdict = "Accepted";
  let stdout = "";
  let stderr = "";

  for (const testCase of hiddenTests) {
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

    memoryUsed = Math.max(
      memoryUsed,
      Number(response.memoryUsed || 0)
    );

    // Compilation Error
    if (response.compileOutput) {
      verdict = "Compilation Error";

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: "",
        passed: false,
        stdout: "",
        stderr: response.compileOutput,
      });

      break;
    }

    // Runtime Error
    if (stderr) {
      verdict = "Runtime Error";

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: stdout.trim(),
        passed: false,
        stdout,
        stderr,
      });

      break;
    }

    const actualOutput = stdout.trim();
    const expectedOutput = (testCase.expectedOutput || "").trim();

    const passed = actualOutput === expectedOutput;

    if (passed) {
      passedCount++;
    } else {
      verdict = "Wrong Answer";
    }

    results.push({
      input: testCase.input,
      expectedOutput,
      actualOutput,
      passed,
      stdout,
      stderr,
    });
  }

  if (
    passedCount === hiddenTests.length &&
    verdict !== "Compilation Error" &&
    verdict !== "Runtime Error"
  ) {
    verdict = "Accepted";
  }

  const points = Math.round(
    (passedCount / hiddenTests.length) * 100
  );

  const failedTestCase =
    results.find((r) => !r.passed) || null;

  return {
    verdict,

    points,

    passedCount,

    totalTests: hiddenTests.length,

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