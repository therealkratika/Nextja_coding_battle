const Battle = require("../model/battle");
const Question = require("../model/question");
const Submission = require("../model/submission");

const { judgeSubmission } = require("../services/judgeService");

const submitCode = async (req, res) => {
  try {
    const {
      roomCode,
      questionId,
      username,
      language,
      code,
    } = req.body;

    if (
      !roomCode ||
      !questionId ||
      !username ||
      !language ||
      code === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required submission fields",
      });
    }

    const battle = await Battle.findOne({
      roomCode: roomCode.trim().toUpperCase(),
    });

    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle not found",
      });
    }

    if (battle.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Battle is not active",
      });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const codeToRun =
      code || question.starterCode?.[language] || "";

    const judgeResult = await judgeSubmission({
      code: codeToRun,
      language,
      question,
    });

    const {
      verdict,
      points,
      passedCount,
      totalTests,
      executionTime,
      memoryUsed,
      stdout,
      stderr,
      results,
    } = judgeResult;

    // Previous best submission for this player & question
    const previousBest = await Submission.findOne({
      battleId: battle._id,
      questionId: question._id,
      username,
    }).sort({ points: -1 });

    const previousPoints = previousBest?.points || 0;

    const scoreDifference = Math.max(
      0,
      points - previousPoints
    );

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

    const player = battle.players.find(
      (p) =>
        p.username.toLowerCase() ===
        username.toLowerCase()
    );

    if (player && scoreDifference > 0) {
      player.score =
        (player.score || 0) + scoreDifference;

      if (verdict === "Accepted") {
        player.solvedCount =
          Math.max(player.solvedCount || 0, 1);
      }

      await battle.save();
    }

    const leaderboard = battle.players
      .map((player) => ({
        username: player.username,
        score: player.score || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const io = req.app.get("io");

    if (io) {
      io.to(battle.roomCode).emit(
        "leaderboard-updated",
        {
          leaderboard,
        }
      );

      io.to(battle.roomCode).emit(
        "submission-made",
        {
          submission,
          verdict,
          questionId: question._id,
        }
      );

      if (verdict === "Accepted") {
        io.to(battle.roomCode).emit(
          "question-finished",
          {
            username,
            questionId: question._id,
            questionTitle: question.title,
          }
        );
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        submission,

        verdict,

        points,

        passedTests: passedCount,

        totalTests,

        executionTime,

        memoryUsed,

        stdout,

        stderr,

        results,

        leaderboard,
      },
    });
  } catch (error) {
    console.error("submitCode:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Submission failed",
    });
  }
};

module.exports = {
  submitCode,
};