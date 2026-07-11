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

const getBattleSubmissions = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const battle = await Battle.findOne({ roomCode: roomCode.toUpperCase() });

    if (!battle) {
      return res.status(404).json({ success: false, message: "Battle room not found." });
    }

    const submissions = await Submission.find({ battleId: battle._id }).sort({ createdAt: 1 }).lean();
    const questionDocs = await Question.find({ _id: { $in: battle.questions || [] } }).lean().select("title");
    const questionMap = questionDocs.reduce((map, question) => {
      map[question._id.toString()] = question.title;
      return map;
    }, {});

    const latestByPlayerQuestion = {};
    submissions.forEach((submission) => {
      const username = submission.username || "";
      const questionId = submission.questionId?.toString();
      if (!username || !questionId) return;

      const key = `${username}:${questionId}`;
      if (!latestByPlayerQuestion[key] || new Date(submission.createdAt) > new Date(latestByPlayerQuestion[key].createdAt)) {
        latestByPlayerQuestion[key] = submission;
      }
    });

    const players = (battle.players || []).map((player) => {
      const submissionsForPlayer = (battle.questions || [])
        .map((questionId) => {
          const key = `${player.username}:${questionId.toString()}`;
          const submission = latestByPlayerQuestion[key];
          if (!submission) return null;

          return {
            questionId: questionId.toString(),
            questionTitle: questionMap[questionId.toString()] || "Question",
            code: submission.code || "",
            verdict: submission.verdict || "Unknown",
            language: submission.language || "",
            points: submission.points || 0,
            createdAt: submission.createdAt,
          };
        })
        .filter(Boolean);

      return {
        username: player.username,
        submissions: submissionsForPlayer,
      };
    });

    const allPlayersSubmitted = players.every(
      (player) => player.submissions.length === (battle.questions || []).length
    );

    if (battle.status !== "completed" && !allPlayersSubmitted) {
      return res.status(403).json({
        success: false,
        message: "Peer code review is available once all players have submitted or when the battle ends.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        battleStatus: battle.status,
        revealAllowed: true,
        players,
      },
    });
  } catch (error) {
    console.error("getBattleSubmissions error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch battle submissions." });
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

const leaderboardService = require("../services/leaderboardService");

async function getFinalLeaderboard(req, res) {
  try {
    const leaderboard =
      await leaderboardService.getFinalLeaderboard(
        req.params.roomCode
      );

    return res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  joinBattle,
  createBattle,
  leaveBattle,
  getBattle,
  getBattleQuestions,
  getBattleSubmissions,
  getFinalLeaderboard,
};

