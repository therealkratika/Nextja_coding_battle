
const Battle = require("../../model/battle.js");
const redis = require("../../config/redis");

module.exports = function registerJoinRoom(socket, io) {
  socket.on("join-room", async ({ roomCode, username } = {}) => {
    try {
      if (
        typeof roomCode !== "string" ||
        typeof username !== "string" ||
        !roomCode.trim() ||
        !username.trim()
      ) {
        return socket.emit("error", {
          message: "roomCode and username are required to join a room.",
        });
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const normalizedUsername = username.trim();

      const battle = await Battle.findOne({
        roomCode: normalizedCode,
      });

      if (!battle) {
        return socket.emit("error", {
          message: "Room not found.",
        });
      }

      const player = battle.players.find(
        (p) =>
          p.username.toLowerCase() ===
          normalizedUsername.toLowerCase()
      );

      // Do not allow unknown users to join active battles either.
      // If spectators are supported, implement separate validation.
      if (!player) {
        return socket.emit("error", {
          message:
            "Player not found in room. Please join via the join form first.",
        });
      }

      // Capture the previous socket before replacing it.
      const previousSocketId = player.socketId;

      player.socketId = socket.id;
      await battle.save();

      // Remove the old socket mapping when this player reconnects.
      if (
        previousSocketId &&
        previousSocketId !== socket.id
      ) {
        await redis.client.del(
          `socket:${previousSocketId}`
        );
      }

      await redis.client.set(
        `socket:${socket.id}`,
        JSON.stringify({
          roomCode: normalizedCode,
          username: player.username,
        }),
        { EX: 60 * 60 }
      );

      socket.join(normalizedCode);

      socket.emit("room-joined", {
        message: `Welcome to the lobby, ${player.username}!`,
        battle,
      });

      io.to(normalizedCode).emit("player-list-updated", {
        players: battle.players,
        host: battle.host,
      });

      socket.to(normalizedCode).emit("player-joined", {
        username: player.username,
        message: `${player.username} joined the battle!`,
      });

      console.log(
        `👤 ${player.username} joined room: ${normalizedCode} (socket: ${socket.id})`
      );
    } catch (error) {
      console.error(
        "join-room error:",
        error?.message || error
      );

      socket.emit("error", {
        message: "Server error while joining room.",
      });
    }
  });
};
