const {
  executeCode
} = require("./pistonService");
async function judgeSubmission({
  code,
  language,
  question
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

  /*
   * =================================
   * RUN EACH HIDDEN TEST CASE
   * =================================
   */

  for (const testCase of hiddenTests) {
    const response = await executeCode({
      language,
      code,
      stdin: testCase.input || ""
    });
    stdout = response.stdout || "";
    stderr = response.stderr || "";
    executionTime = Math.max(executionTime, Number(response.executionTime || 0));
    memoryUsed = Math.max(memoryUsed, Number(response.memoryUsed || 0));

    /*
     * =================================
     * COMPILATION ERROR
     * =================================
     */

    if (response.status === "Compilation Error") {
      verdict = "Compilation Error";
      results.push({
        input: testCase.input || "",
        expectedOutput: testCase.expectedOutput || "",
        actualOutput: "",
        passed: false,
        stdout: "",
        stderr: response.compileOutput || response.stderr || ""
      });

      // No point running remaining tests
      break;
    }

    /*
     * =================================
     * RUNTIME ERROR
     * =================================
     */

    if (response.status === "Runtime Error") {
      verdict = "Runtime Error";
      results.push({
        input: testCase.input || "",
        expectedOutput: testCase.expectedOutput || "",
        actualOutput: stdout.trim(),
        passed: false,
        stdout,
        stderr
      });

      // Stop because program already failed
      break;
    }

    /*
     * =================================
     * COMPARE OUTPUT
     * =================================
     */

    const actualOutput = stdout.trim();
    const expectedOutput = (testCase.expectedOutput || "").trim();
    const passed = actualOutput === expectedOutput;
    if (passed) {
      passedCount++;
    } else {
      verdict = "Wrong Answer";
    }
    results.push({
      input: testCase.input || "",
      expectedOutput,
      actualOutput,
      passed,
      stdout,
      stderr
    });

    /*
     * Stop at first wrong answer.
     *
     * Remove this block if you want
     * every hidden test to execute.
     */

    if (!passed) {
      break;
    }
  }

  /*
   * =================================
   * FINAL VERDICT
   * =================================
   */

  if (passedCount === hiddenTests.length && verdict !== "Compilation Error" && verdict !== "Runtime Error") {
    verdict = "Accepted";
  }

  /*
   * =================================
   * SCORE
   * =================================
   */

  const points = Math.round(passedCount / hiddenTests.length * 100);

  /*
   * =================================
   * FAILED TEST CASE
   * =================================
   */

  const failedTestCase = results.find(result => !result.passed) || null;

  /*
   * =================================
   * RETURN RESULT
   * =================================
   */

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
    results
  };
}
module.exports = {
  judgeSubmission
};