const Battle = require("../../model/battle.js");

module.exports = function registerJoinRoom(socket, io) {
  socket.on("join-room", async ({ roomCode, username }) => {
    try {
      if (!roomCode || !username) {
        return socket.emit("error", {
          message: "roomCode and username are required to join a room.",
        });
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const battle = await Battle.findOne({ roomCode: normalizedCode });

      if (!battle) {
        return socket.emit("error", { message: "Room not found." });
      }

      const player = battle.players.find(
        (p) => p.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!player && battle.status === "waiting") {
        return socket.emit("error", {
          message: "Player not found in room. Please join via the join form first.",
        });
      }

      if (player) {
        player.socketId = socket.id;
        await battle.save();
      }

      socket.join(normalizedCode);

      socket.emit("room-joined", {
        message: `Welcome to the lobby, ${username}!`,
        battle,
      });

      io.to(normalizedCode).emit("player-list-updated", {
        players: battle.players,
        host: battle.host,
      });

      socket.to(normalizedCode).emit("player-joined", {
        username,
        message: `${username} joined the battle!`,
      });

      console.log(`👤 ${username} joined room: ${normalizedCode} (socket: ${socket.id})`);
    } catch (error) {
      console.error("join-room error:", error?.message || error);
      socket.emit("error", { message: "Server error while joining room." });
    }
  });
};
