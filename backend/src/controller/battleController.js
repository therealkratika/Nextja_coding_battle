const Battle = require('../model/battle.js')
const generateUniqueRoomCode = require('../utils/generateRoomCode.js')

 const createBattle = async (req, res) => {
  try {
    const { battleName, difficulty, questionCount, timeLimit, maxPlayers, username } = req.body;

    // Basic validation — all fields required
    if (!battleName || !username || !questionCount || !timeLimit || !maxPlayers) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: battleName, username, questionCount, timeLimit, maxPlayers",
      });
    }

    // Generate a collision-free room code
    const roomCode = await generateUniqueRoomCode();

    // Create the battle document in MongoDB
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

    // 1. Both fields are mandatory
    if (!roomCode || !username) {
      return res.status(400).json({
        success: false,
        message: "roomCode and username are required",
      });
    }
    const normalizedCode = roomCode.trim().toUpperCase();
    const normalizedUsername = username.trim();

    // 3. Does the room exist?
    const battle = await Battle.findOne({ roomCode: normalizedCode });
    if (!battle) {
      return res.status(404).json({
        success: false,
        message: "Room not found. Double-check your room code.",
      });
    }

    // 4. Is the battle still accepting players?
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

    // 6. Is the username already taken inside this room?
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

    // 8. Return the full updated battle so the frontend can build the lobby
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

// ─────────────────────────────────────────────
// POST /api/battle/leave
// ─────────────────────────────────────────────
/**
 * Removes a player from a battle room via REST.
 * The Socket.io handler also handles this on disconnect.
 * Body: { roomCode, username }
 */
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

    // Remove the player from the players array
    battle.players = battle.players.filter((p) => p.username !== username);

    // If the host leaves and others remain, assign a new host
    if (battle.host === username && battle.players.length > 0) {
      battle.host = battle.players[0].username;
    }

    // If no players remain, delete the room entirely
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
joinBattle, createBattle, leaveBattle, getBattle
};
