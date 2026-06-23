const Battle = require("../../model/battle.js");

module.exports = async function handlePlayerLeave({ socket, io, roomCode, username, reason }) {
  const battle = await Battle.findOne({ roomCode });
  if (!battle) return;

  battle.players = battle.players.filter(
    (player) => player.username.toLowerCase() !== username.toLowerCase()
  );

  const hostLeft = battle.host.toLowerCase() === username.toLowerCase();
  if (hostLeft && battle.players.length > 0) {
    battle.host = battle.players[0].username;
    io.to(roomCode).emit("host-changed", {
      newHost: battle.host,
      message: `${battle.host} is now the host.`,
    });
    console.log(`Host transferred to: ${battle.host} in room: ${roomCode}`);
  }

  if (battle.players.length === 0) {
    await Battle.deleteOne({ roomCode });
    console.log(`Room ${roomCode} deleted — no players remaining.`);
    return;
  }

  await battle.save();
  socket.leave(roomCode);

  io.to(roomCode).emit("player-left", {
    username,
    message: `${username} has ${reason === "disconnected" ? "disconnected" : "left the lobby"}.`,
    players: battle.players,
    host: battle.host,
  });

  io.to(roomCode).emit("player-list-updated", {
    players: battle.players,
    host: battle.host,
  });

  console.log(`${username} ${reason} from room: ${roomCode}`);
};
