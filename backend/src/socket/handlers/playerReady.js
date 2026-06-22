const Battle = require("../../model/battle.js");

module.exports = function registerPlayerReady(socket, io) {
  socket.on("player-ready", async ({ roomCode, username }) => {
    try {
      if (!roomCode || !username) {
        return socket.emit("error", { message: "roomCode and username are required." });
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const battle = await Battle.findOne({ roomCode: normalizedCode });

      if (!battle) {
        return socket.emit("error", { message: "Room not found." });
      }

      if (battle.status !== "waiting") {
        return socket.emit("error", {
          message: "Battle has already started.",
        });
      }

      const player = battle.players.find(
        (p) => p.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!player) {
        return socket.emit("error", { message: "Player not found in room." });
      }

      player.ready = !player.ready;
      await battle.save();

      io.to(normalizedCode).emit("player-list-updated", {
        players: battle.players,
        host: battle.host,
      });

      console.log(
        `${player.ready ? "✅" : "⬜"} ${username} is ${player.ready ? "READY" : "NOT READY"} in room: ${normalizedCode}`
      );

      const totalPlayers = battle.players.length;
      const readyCount = battle.players.filter((p) => p.ready).length;
      const allReady = totalPlayers >= 2 && readyCount === totalPlayers;

      if (allReady) {
        io.to(normalizedCode).emit("all-players-ready", {
          message: "All players are ready! Waiting for the host to start.",
          readyCount,
          totalPlayers,
        });
        console.log(`🟢 All ${totalPlayers} players ready in room: ${normalizedCode}`);
      }
    } catch (error) {
      console.error("player-ready error:", error?.message || error);
      socket.emit("error", { message: "Server error while updating ready status." });
    }
  });
};
