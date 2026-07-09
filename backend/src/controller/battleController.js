const Battle = require("../model/battle.js");
const Question = require("../model/question.js");
const generateUniqueRoomCode = require("../utils/generateRoomCode.js");
const { sanitizeQuestion } = require("../services/questionService.js");
const Submission = require("../model/submission.js");

const createBattle = async (req, res) => {
  try {
    const { battleName, difficulty, questionCount, timeLimit, maxPlayers, username } = req.body;

    if (!battleName || !username || !questionCount || !timeLimit || !maxPlayers) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: battleName, username, questionCount, timeLimit, maxPlayers",
      });
    }

    const roomCode = await generateUniqueRoomCode();

    const battle = await Battle.create({
      battleName,
      roomCode,
      difficulty: difficulty || "Random",
      questionCount,
      timeLimit,
      maxPlayers,
      host: username,
      players: [
        {
          username: username.trim(),
          socketId: `pending:${Date.now()}`,
          ready: false,
          score: 0,
        },
      ],
      status: "waiting",
      questions: [],
      currentQuestion: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Battle room created successfully",
      data: battle,
    });
  } catch (error) {
    console.error("createBattle error:", error);
    return res.status(500).json({ success: false, message: "Server error while creating battle" });
  }
};

const joinBattle = async (req, res) => {
  try {
    const { roomCode, username } = req.body;

    if (!roomCode || !username) {
      return res.status(400).json({
        success: false,
        message: "roomCode and username are required",
      });
    }

    const normalizedCode = roomCode.trim().toUpperCase();
    const normalizedUsername = username.trim();

    const battle = await Battle.findOne({ roomCode: normalizedCode });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Room not found. Double-check your room code.",
      });
    }

    if (battle.status !== "waiting") {
      return res.status(400).json({
        success: false,
        message: "This battle has already started or has ended.",
      });
    }

    if (battle.players.length >= battle.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: `Room is full! Maximum players: ${battle.maxPlayers}`,
      });
    }

    const nameTaken = battle.players.some(
      (p) => p.username.toLowerCase() === normalizedUsername.toLowerCase()
    );
    if (nameTaken) {
      return res.status(400).json({
        success: false,
        message: "That username is already taken in this room. Please choose another.",
      });
    }

    battle.players.push({
      username: normalizedUsername,
      socketId: `pending:${Date.now()}`,
      ready: false,
      score: 0,
    });

    await battle.save();

    return res.status(200).json({
      success: true,
      message: `${normalizedUsername} joined the room successfully!`,
      data: battle,
    });
  } catch (error) {
    console.error("joinBattle error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while joining battle",
    });
  }
};

const getBattle = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const battle = await Battle.findOne({ roomCode: roomCode.toUpperCase() });

    if (!battle) {
      return res.status(404).json({ success: false, message: "Battle room not found." });
    }

    return res.status(200).json({ success: true, data: battle });
  } catch (error) {
    console.error("getBattle error:", error.message);
    return res.status(500).json({ success: false, message: "Server error while fetching battle" });
  }
};

const getBattleQuestions = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const battle = await Battle.findOne({ roomCode: roomCode.toUpperCase() });

    if (!battle) {
      return res.status(404).json({ success: false, message: "Battle room not found." });
    }

    if (!battle.questions || battle.questions.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const questions = await Question.find({ _id: { $in: battle.questions } }).lean();
    const publicQuestions = questions.map((question) => sanitizeQuestion(question));

    return res.status(200).json({ success: true, data: publicQuestions });
  } catch (error) {
    console.error("getBattleQuestions error:", error.message);
    return res.status(500).json({ success: false, message: "Server error while fetching questions" });
  }
};

const leaveBattle = async (req, res) => {
  try {
    const { roomCode, username } = req.body;

    if (!roomCode || !username) {
      return res.status(400).json({ success: false, message: "roomCode and username are required" });
    }

    const battle = await Battle.findOne({ roomCode: roomCode.toUpperCase() });

    if (!battle) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    battle.players = battle.players.filter((p) => p.username !== username);

    if (battle.host === username && battle.players.length > 0) {
      battle.host = battle.players[0].username;
    }

    if (battle.players.length === 0) {
      await Battle.deleteOne({ roomCode: battle.roomCode });
      return res.status(200).json({ success: true, message: "Room deleted as no players remain." });
    }

    await battle.save();

    return res.status(200).json({
      success: true,
      message: `${username} left the room.`,
      data: battle,
    });
  } catch (error) {
    console.error("leaveBattle error:", error.message);
    return res.status(500).json({ success: false, message: "Server error while leaving battle" });
  }
};

module.exports = {
  joinBattle,
  createBattle,
  leaveBattle,
  getBattle,
  getBattleQuestions,
};

async function getFinalLeaderboard(req, res) {
  try {
    const { roomCode } = req.params;
    const battle = await Battle.findOne({ roomCode: roomCode.toUpperCase() });
    if (!battle) return res.status(404).json({ success: false, message: "Battle not found" });

    const submissions = await Submission.find({ battleId: battle._id }).lean();

    // gather questions and total test counts
    const questions = await Question.find({ _id: { $in: battle.questions || [] } }).lean();
    const questionTestCounts = {};
    questions.forEach((q) => {
      const total = (q.sampleTestCases || []).length + (q.hiddenTestCases || []).length;
      questionTestCounts[q._id.toString()] = Math.max(1, total);
    });

    const players = (battle.players || []).map((p) => p.username);

    const stats = players.map((username) => {
      const byUser = submissions.filter((s) => s.username === username);
      let totalPassed = 0;
      let totalPossible = 0;
      let fullSolved = 0;
      let totalScore = 0;
      let solveTimeSum = 0;

      const perQuestionBest = {};

      byUser.forEach((s) => {
        const qid = s.questionId.toString();
        const passed = s.passedCount || 0;
        const total = s.totalTests || questionTestCounts[qid] || 1;
        if (!perQuestionBest[qid] || perQuestionBest[qid].passed < passed) {
          perQuestionBest[qid] = { passed, total, createdAt: s.createdAt };
        }
      });

      Object.keys(perQuestionBest).forEach((qid) => {
        const best = perQuestionBest[qid];
        totalPassed += best.passed;
        totalPossible += best.total;
        const qPoints = Math.round((best.passed / Math.max(best.total, 1)) * 100);
        totalScore += qPoints;
        if (best.passed >= best.total) {
          fullSolved += 1;
          const solvedAt = new Date(best.createdAt).getTime();
          const startAt = battle.startedAt ? new Date(battle.startedAt).getTime() : 0;
          solveTimeSum += Math.max(0, solvedAt - startAt);
        }
      });

      return {
        username,
        totalPassed,
        totalPossible,
        fullSolved,
        totalScore,
        solveTimeSum,
      };
    });

    // sort by score desc, tiebreaker solveTimeSum asc
    stats.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.solveTimeSum - b.solveTimeSum;
    });

    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("getFinalLeaderboard error:", error);
    return res.status(500).json({ success: false, message: "Failed to compute final leaderboard" });
  }
}

module.exports.getFinalLeaderboard = getFinalLeaderboard;
