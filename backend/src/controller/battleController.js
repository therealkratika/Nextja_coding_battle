const Battle = require("../model/battle.js");
const Question = require("../model/question.js");
const generateUniqueRoomCode = require("../utils/generateRoomCode.js");
const {
  sanitizeQuestion
} = require("../services/questionService.js");
const Submission = require("../model/submission.js");
const redis = require("../config/redis");
const {
  getCachedBattle,
  cacheBattle,
  invalidateBattleCache,
} = require("../services/battleCache");

const createBattle = async (req, res) => {
  try {
    const {
      battleName,
      difficulty,
      questionCount,
      timeLimit,
      maxPlayers,
      username
    } = req.body;
    if (!battleName || !username || !questionCount || !timeLimit || !maxPlayers) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: battleName, username, questionCount, timeLimit, maxPlayers"
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
      players: [{
        username: username.trim(),
        socketId: `pending:${Date.now()}`,
        ready: false,
        score: 0
      }],
      status: "waiting",
      questions: [],
      currentQuestion: 0
    });
    try {
      await invalidateBattleCache(battle.roomCode);
    } catch (error) {
      console.error(
        "Battle cache invalidation failed:",
        error?.message || error
      );
    }

    return res.status(201).json({
      success: true,
      message: "Battle room created successfully",
      data: battle
    });
  } catch (error) {
    console.error("createBattle error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating battle"
    });
  }
};
const joinBattle = async (req, res) => {
  try {
    const {
      roomCode,
      username
    } = req.body;
    if (!roomCode || !username) {
      return res.status(400).json({
        success: false,
        message: "roomCode and username are required"
      });
    }
    const normalizedCode = roomCode.trim().toUpperCase();
    const normalizedUsername = username.trim();
    const battle = await Battle.findOne({
      roomCode: normalizedCode
    });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Room not found. Double-check your room code."
      });
    }
    if (battle.status !== "waiting") {
      return res.status(400).json({
        success: false,
        message: "This battle has already started or has ended."
      });
    }
    if (battle.players.length >= battle.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: `Room is full! Maximum players: ${battle.maxPlayers}`
      });
    }
    const nameTaken = battle.players.some(p => p.username.toLowerCase() === normalizedUsername.toLowerCase());
    if (nameTaken) {
      return res.status(400).json({
        success: false,
        message: "That username is already taken in this room. Please choose another."
      });
    }
    battle.players.push({
      username: normalizedUsername,
      socketId: `pending:${Date.now()}`,
      ready: false,
      score: 0
    });
    await battle.save();
    try {
      await invalidateBattleCache(normalizedCode);
    } catch (error) {
      console.error(
        "Battle cache invalidation failed:",
        error?.message || error
      );
    }

    return res.status(200).json({
      success: true,
      message: `${normalizedUsername} joined the room successfully!`,
      data: battle
    });
  } catch (error) {
    console.error("joinBattle error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while joining battle"
    });
  }
};
const getBattle = async (req, res) => {
  try {
    const roomCode = req.params.roomCode.trim().toUpperCase();

    try {
      const cachedBattle = await getCachedBattle(roomCode);

      if (cachedBattle) {
        return res.status(200).json({
          success: true,
          data: cachedBattle,
          source: "redis",
        });
      }
    } catch (redisError) {
      console.error(
        "Battle cache read failed:",
        redisError?.message || redisError
      );
    }

    const battle = await Battle.findOne({ roomCode }).lean();

    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle room not found.",
      });
    }

    try {
      await cacheBattle(roomCode, battle);
    } catch (redisError) {
      console.error(
        "Battle cache write failed:",
        redisError?.message || redisError
      );
    }

    return res.status(200).json({
      success: true,
      data: battle,
      source: "mongodb",
    });
  } catch (error) {
    console.error("getBattle error:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching battle",
    });
  }
};
const getBattleQuestions = async (req, res) => {
  try {
    const {
      roomCode
    } = req.params;
    const battle = await Battle.findOne({
      roomCode: roomCode.toUpperCase()
    });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle room not found."
      });
    }
    if (!battle.questions || battle.questions.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    const questions = await Question.find({
      _id: {
        $in: battle.questions
      }
    }).lean();
    const publicQuestions = questions.map(question => sanitizeQuestion(question));
    return res.status(200).json({
      success: true,
      data: publicQuestions
    });
  } catch (error) {
    console.error("getBattleQuestions error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching questions"
    });
  }
};
const getBattleSubmissions = async (req, res) => {
  try {
    const {
      roomCode
    } = req.params;
    const battle = await Battle.findOne({
      roomCode: roomCode.toUpperCase()
    });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle room not found."
      });
    }
    const submissions = await Submission.find({
      battleId: battle._id
    }).sort({
      createdAt: 1
    }).lean();
    const questionDocs = await Question.find({
      _id: {
        $in: battle.questions || []
      }
    }).lean().select("title");
    const questionMap = questionDocs.reduce((map, question) => {
      map[question._id.toString()] = question.title;
      return map;
    }, {});
    const latestByPlayerQuestion = {};
    submissions.forEach(submission => {
      const username = submission.username || "";
      const questionId = submission.questionId?.toString();
      if (!username || !questionId) return;
      const key = `${username}:${questionId}`;
      if (!latestByPlayerQuestion[key] || new Date(submission.createdAt) > new Date(latestByPlayerQuestion[key].createdAt)) {
        latestByPlayerQuestion[key] = submission;
      }
    });
    const players = (battle.players || []).map(player => {
      const submissionsForPlayer = (battle.questions || []).map(questionId => {
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
          createdAt: submission.createdAt
        };
      }).filter(Boolean);
      return {
        username: player.username,
        submissions: submissionsForPlayer
      };
    });
    const allPlayersSubmitted = players.every(player => player.submissions.length === (battle.questions || []).length);
    if (battle.status !== "completed" && !allPlayersSubmitted) {
      return res.status(200).json({
        success: true,
        data: {
          battleStatus: battle.status,
          revealAllowed: false,
          players: []
        }
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        battleStatus: battle.status,
        revealAllowed: true,
        players
      }
    });
  } catch (error) {
    console.error("getBattleSubmissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch battle submissions."
    });
  }
};
const leaveBattle = async (req, res) => {
  try {
    const {
      roomCode,
      username
    } = req.body;
    if (!roomCode || !username) {
      return res.status(400).json({
        success: false,
        message: "roomCode and username are required"
      });
    }
    const battle = await Battle.findOne({
      roomCode: roomCode.toUpperCase()
    });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Room not found."
      });
    }
    battle.players = battle.players.filter(p => p.username !== username);
    if (battle.host === username && battle.players.length > 0) {
      battle.host = battle.players[0].username;
    }
    if (battle.players.length === 0) {
      await Battle.deleteOne({
        roomCode: battle.roomCode
      });
      try {
        await invalidateBattleCache(battle.roomCode);
      } catch (error) {
        console.error(
          "Battle cache invalidation failed:",
          error?.message || error
        );
      }

      return res.status(200).json({
        success: true,
        message: "Room deleted as no players remain."
      });
    }
    await battle.save();
    try {
      await invalidateBattleCache(battle.roomCode);
    } catch (error) {
      console.error(
        "Battle cache invalidation failed:",
        error?.message || error
      );
    }

    return res.status(200).json({
      success: true,
      message: `${username} left the room.`,
      data: battle
    });
  } catch (error) {
    console.error("leaveBattle error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while leaving battle"
    });
  }
};
const leaderboardService = require("../services/leaderboardService");
async function getFinalLeaderboard(req, res) {
  try {
    const leaderboard = await leaderboardService.getFinalLeaderboard(req.params.roomCode);
    return res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function endBattle(req, res) {
  try {
    const roomCode = req.params.roomCode.trim().toUpperCase();
    const { username } = req.body;

    if (typeof username !== "string" || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "username is required",
      });
    }

    const battle = await Battle.findOne({ roomCode });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Battle room not found.",
      });
    }

    const isParticipant = battle.players.some(
      (player) =>
        player.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Only a battle participant can end the battle.",
      });
    }

    if (battle.status === "waiting") {
      return res.status(400).json({
        success: false,
        message: "The battle has not started yet.",
      });
    }

    if (battle.status === "active") {
      const winner =
        [...battle.players].sort(
          (a, b) => (b.score || 0) - (a.score || 0)
        )[0]?.username || null;
      const completedBattle = await Battle.findOneAndUpdate(
        { roomCode, status: "active" },
        {
          $set: {
            status: "completed",
            endedAt: new Date(),
            winner,
          },
        },
        { new: true }
      );

      if (completedBattle) {
        try {
          await redis.client.del(`battle:${roomCode}:deadline`);
        } catch (error) {
          console.error(
            "Battle deadline cleanup failed:",
            error?.message || error
          );
        }

        try {
          await invalidateBattleCache(roomCode);
        } catch (error) {
          console.error(
            "Battle cache invalidation failed:",
            error?.message || error
          );
        }

        const io = req.app.get("io");
        if (io) {
          const leaderboard = completedBattle.players
            .map((player) => ({
              username: player.username,
              score: player.score || 0,
              solvedCount: player.solvedCount || 0,
            }))
            .sort((a, b) => b.score - a.score);

          io.to(roomCode).emit("battle-ended", {
            message: "The battle has ended.",
            winner: completedBattle.winner,
            leaderboard,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Battle ended.",
    });
  } catch (error) {
    console.error("endBattle error:", error?.message || error);
    return res.status(500).json({
      success: false,
      message: "Server error while ending battle.",
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
  endBattle,
};