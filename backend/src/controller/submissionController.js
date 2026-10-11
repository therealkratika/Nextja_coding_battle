const { randomUUID } = require("node:crypto");

const Battle = require("../model/battle");
const Question = require("../model/question");
const Submission = require("../model/submission");
const {
  judgeSubmission
} = require("../services/judgeService");
const {
  syncPlayerScore,
  getLeaderboard,
} = require("../services/leaderboard");
const {
  acquireSubmissionLock,
  releaseSubmissionLock,
} = require("../services/submissionLock");

const submitCode = async (req, res) => {
  let submissionLockKey = null;
  let submissionLockToken = null;

  try {
    const {
      roomCode,
      questionId,
      username,
      language,
      code
    } = req.body;
    if (
      typeof roomCode !== "string" ||
      typeof questionId !== "string" ||
      typeof username !== "string" ||
      typeof language !== "string" ||
      !roomCode.trim() ||
      !questionId.trim() ||
      !username.trim() ||
      !language.trim() ||
      code === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required submission fields"
      });
    }
    const battle = await Battle.findOne({
      roomCode: roomCode.trim().toUpperCase()
    });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle not found"
      });
    }
    if (battle.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Battle is not active"
      });
    }
    const player = battle.players.find(
      (battlePlayer) =>
        battlePlayer.username.toLowerCase() ===
        username.trim().toLowerCase()
    );
    if (!player) {
      return res.status(404).json({
        success: false,
        message: "Player not found in this battle",
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found"
      });
    }

    submissionLockToken = randomUUID();
    submissionLockKey = await acquireSubmissionLock(
      battle.roomCode,
      username.trim().toLowerCase(),
      String(question._id),
      submissionLockToken
    );

    if (!submissionLockKey) {
      return res.status(409).json({
        success: false,
        message:
          "A submission for this question is already being processed. Please retry.",
      });
    }

    const codeToRun = code || question.starterCode?.[language] || "";
    const judgeResult = await judgeSubmission({
      code: codeToRun,
      language,
      question
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
      results
    } = judgeResult;

    // Previous best submission for this player & question
    const previousBest = await Submission.findOne({
      battleId: battle._id,
      questionId: question._id,
      username: player.username
    }).sort({
      points: -1
    });
    const previousPoints = previousBest?.points || 0;
    const scoreDifference = Math.max(0, points - previousPoints);
    const submission = await Submission.create({
      battleId: battle._id,
      roomCode: battle.roomCode,
      questionId: question._id,
      username: player.username,
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
      results
    });

    if (scoreDifference > 0) {
      player.score = (player.score || 0) + scoreDifference;
    }

    const acceptedQuestionIds = await Submission.distinct(
      "questionId",
      {
        battleId: battle._id,
        username: player.username,
        verdict: "Accepted",
      }
    );

    player.solvedCount = acceptedQuestionIds.length;
    await battle.save();

    const mongoLeaderboard = battle.players
      .map((player) => ({
        username: player.username,
        score: player.score || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        rank: index + 1,
        ...player,
      }));
    let leaderboard = mongoLeaderboard;

    try {
      await Promise.all(
        battle.players.map((battlePlayer) =>
          syncPlayerScore(
            battle.roomCode,
            battlePlayer.username,
            battlePlayer.score || 0
          )
        )
      );

      leaderboard = await getLeaderboard(battle.roomCode);
    } catch (error) {
      console.error(
        "Leaderboard Redis sync failed:",
        error?.message || error
      );
      leaderboard = mongoLeaderboard;
    }

    const io = req.app.get("io");
    if (io) {
      io.to(battle.roomCode).emit("leaderboard-updated", {
        roomCode: battle.roomCode,
        leaderboard
      });
      io.to(battle.roomCode).emit("submission-made", {
        submission,
        verdict,
        questionId: question._id
      });
      if (verdict === "Accepted") {
        io.to(battle.roomCode).emit("question-finished", {
          username,
          questionId: question._id,
          questionTitle: question.title
        });
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
        leaderboard
      }
    });
  } catch (error) {
    console.error("submitCode:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Submission failed"
    });
  } finally {
    if (submissionLockKey) {
      try {
        await releaseSubmissionLock(
          submissionLockKey,
          submissionLockToken
        );
      } catch (error) {
        console.error(
          "Submission lock release failed:",
          error?.message || error
        );
      }
    }
  }
};
module.exports = {
  submitCode
};