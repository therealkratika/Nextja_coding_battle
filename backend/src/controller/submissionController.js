const Battle = require("../model/battle.js");
const Question = require("../model/question.js");
const Submission = require("../model/submission.js");
const pistonService = require("../services/pistonService.js");

const submitCode = async (req, res) => {
  try {
    const { roomCode, questionId, username, language, code } = req.body;

    if (!roomCode || !questionId || !username || !language || code === undefined) {
      return res.status(400).json({ success: false, message: "Missing required submission fields" });
    }

    const battle = await Battle.findOne({ roomCode: roomCode.toUpperCase() });
    if (!battle) {
      return res.status(404).json({ success: false, message: "Battle not found" });
    }

    if (battle.status !== "active") {
      return res.status(400).json({ success: false, message: "Battle is not active" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const testCases = (question.hiddenTestCases || []).filter((item) => item && item.input !== undefined);
    if (testCases.length === 0) {
      return res.status(400).json({ success: false, message: "No hidden test cases available for this question" });
    }

    const starterCode = question.starterCode?.[language] || code;
    const codeToRun = code || starterCode;

    const results = [];
    let passedCount = 0;
    let verdict = "Wrong Answer";
    let executionTime = 0;
    let memoryUsed = 0;
    let stdout = "";
    let stderr = "";
    let totalTests = testCases.length;

    for (const testCase of testCases) {
      const result = await pistonService.executeCode({
        language,
        code: codeToRun,
        stdin: testCase.input || "",
      });

      executionTime = Math.max(executionTime, result.executionTime || 0);
      memoryUsed = Math.max(memoryUsed, result.memoryUsed || 0);

      const actualOutput = (result.stdout || "").trim();
      const expectedOutput = (testCase.expectedOutput || "").trim();
      const passed = actualOutput === expectedOutput;

      if (!passed) {
        verdict = "Wrong Answer";
      }

      if (result.exitCode !== 0) {
        verdict = result.stderr ? "Runtime Error" : "Compilation Error";
      }

      if (passed) {
        passedCount += 1;
      }

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        stderr: result.stderr,
        stdout: result.stdout,
      });

      if (verdict === "Runtime Error" || verdict === "Compilation Error") {
        break;
      }
    }

    if (results.length > 0 && passedCount === results.length && verdict !== "Runtime Error" && verdict !== "Compilation Error") {
      verdict = "Accepted";
    }

    const points = Math.round((passedCount / Math.max(totalTests, 1)) * 100);

    const submission = await Submission.create({
      battleId: battle._id,
      roomCode: battle.roomCode,
      questionId: question._id,
      username,
      language,
      code: codeToRun,
      verdict,
      executionTime,
      memoryUsed,
      points,
      stdout,
      stderr,
      passedCount,
      totalTests,
      results,
    });

    if (verdict === "Accepted") {
      const player = battle.players.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
      if (player) {
        player.score = (player.score || 0) + points;
        player.solvedCount = (player.solvedCount || 0) + 1;
        await battle.save();
      }
    }

    const leaderboard = battle.players
      .map((player) => ({ username: player.username, score: player.score || 0 }))
      .sort((a, b) => b.score - a.score);

    const io = req.app.get("io");
    if (io) {
      io.to(battle.roomCode).emit("submission-made", {
        submission,
        verdict,
        question,
      });
      io.to(battle.roomCode).emit("leaderboard-updated", { leaderboard });
      if (verdict === "Accepted") {
        io.to(battle.roomCode).emit("question-finished", {
          username,
          questionId: question._id,
          questionTitle: question.title,
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        submission,
        verdict,
        passedTests: passedCount,
        totalTests: results.length,
        executionTime,
        memoryUsed,
        results,
        leaderboard,
      },
    });
  } catch (error) {
    console.error("submitCode error:", error);
    return res.status(500).json({ success: false, message: "Submission failed" });
  }
};

module.exports = { submitCode };
