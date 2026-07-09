const Battle = require("../../model/battle.js");
const Question = require("../../model/question.js");

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

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

      const filter = battle.difficulty && battle.difficulty !== "Random" ? { difficulty: battle.difficulty } : {};
      const availableQuestions = await Question.find(filter).lean();
      const selectedQuestions = shuffleArray(availableQuestions).slice(0, battle.questionCount || 1);

      battle.status = "active";
      battle.startedAt = new Date();
      battle.endedAt = new Date(Date.now() + battle.timeLimit * 60 * 1000);
      battle.questions = selectedQuestions.map((question) => question._id);
      battle.currentQuestion = 0;
      battle.winner = null;
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
          startedAt: battle.startedAt,
          endsAt: battle.endedAt,
        },
      });

      const endBattle = async () => {
        const currentBattle = await Battle.findOne({ roomCode: normalizedCode });
        if (!currentBattle || currentBattle.status !== "active") {
          return;
        }

        const sortedPlayers = [...currentBattle.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        currentBattle.status = "completed";
        currentBattle.endedAt = new Date();
        currentBattle.winner = sortedPlayers[0]?.username || null;
        await currentBattle.save();

        const leaderboard = currentBattle.players
          .map((player) => ({ username: player.username, score: player.score || 0, solvedCount: player.solvedCount || 0 }))
          .sort((a, b) => b.score - a.score);

        io.to(normalizedCode).emit("battle-ended", {
          message: "The battle has ended.",
          winner: currentBattle.winner,
          leaderboard,
        });
      };

      setTimeout(endBattle, battle.timeLimit * 60 * 1000);

      console.log(`⚔️  Battle STARTED in room: ${normalizedCode} (host: ${host})`);
    } catch (error) {
      console.error("start-battle error:", error?.message || error);
      socket.emit("error", { message: "Server error while starting battle." });
    }
  });
};
