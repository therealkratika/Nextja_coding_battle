const Battle = require("../../model/battle.js");

module.exports = function registerStartBattle(socket, io) {
  socket.on("start-battle", async ({ roomCode, host }) => {
    try {
      if (!roomCode || !host) {
        return socket.emit("error", { message: "roomCode and host are required." });
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const battle = await Battle.findOne({ roomCode: normalizedCode });

      if (!battle) {
        return socket.emit("error", { message: "Room not found." });
      }

      if (battle.host.toLowerCase() !== host.trim().toLowerCase()) {
        return socket.emit("error", {
          message: "Only the host can start the battle.",
        });
      }

      if (battle.players.length < 2) {
        return socket.emit("error", {
          message: "Need at least 2 players to start the battle.",
        });
      }

      const notReady = battle.players.filter((player) => !player.ready);
      if (notReady.length > 0) {
        const names = notReady.map((player) => player.username).join(", ");
        return socket.emit("error", {
          message: `These players are not ready yet: ${names}`,
        });
      }

      if (battle.status !== "waiting") {
        return socket.emit("error", { message: "Battle has already started." });
      }

      battle.status = "active";
      battle.startedAt = new Date();
      await battle.save();

      io.to(normalizedCode).emit("battle-started", {
        message: "The battle has begun! Good luck! ⚔️",
        roomCode: normalizedCode,
        battle: {
          roomCode: normalizedCode,
          questionCount: battle.questionCount,
          timeLimit: battle.timeLimit,
          difficulty: battle.difficulty,
          battleName: battle.battleName,
        },
      });

      console.log(`⚔️  Battle STARTED in room: ${normalizedCode} (host: ${host})`);
    } catch (error) {
      console.error("start-battle error:", error?.message || error);
      socket.emit("error", { message: "Server error while starting battle." });
    }
  });
};
