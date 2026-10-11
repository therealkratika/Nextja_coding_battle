const Battle = require("../../model/battle.js");
const {
  invalidateBattleCache,
} = require("../../services/battleCache");

module.exports = async function handlePlayerLeave({
  socket,
  io,
  roomCode,
  username,
  reason,
  expectedSocketId,
}) {
  const battle = await Battle.findOne({
    roomCode
  });
  if (!battle) return;

  if (expectedSocketId) {
    const normalizedUsername = username.toLowerCase();
    let updatedBattle = await Battle.findOneAndUpdate(
      {
        roomCode,
        players: {
          $elemMatch: {
            username,
            socketId: expectedSocketId,
          },
        },
      },
      [
        {
          $set: {
            players: {
              $filter: {
                input: "$players",
                as: "player",
                cond: {
                  $not: [{
                    $and: [
                      { $eq: ["$$player.username", username] },
                      { $eq: ["$$player.socketId", expectedSocketId] },
                    ],
                  }],
                },
              },
            },
          },
        },
        {
          $set: {
            host: {
              $cond: [
                { $eq: [{ $toLower: "$host" }, normalizedUsername] },
                {
                  $ifNull: [
                    { $arrayElemAt: ["$players.username", 0] },
                    "$host",
                  ],
                },
                "$host",
              ],
            },
          },
        },
      ],
      { new: true }
    );

    if (!updatedBattle) return false;

    try {
      await invalidateBattleCache(roomCode);
    } catch (cacheError) {
      console.error(
        "Player-leave cache invalidation failed:",
        cacheError?.message || cacheError
      );
    }

    const hostLeft = battle.host.toLowerCase() === normalizedUsername;
    if (hostLeft && updatedBattle.players.length > 0) {
      io.to(roomCode).emit("host-changed", {
        newHost: updatedBattle.host,
        message: `${updatedBattle.host} is now the host.`,
      });
      console.log(
        `Host transferred to: ${updatedBattle.host} in room: ${roomCode}`
      );
    }

    if (updatedBattle.players.length === 0) {
      const deletion = await Battle.deleteOne({
        roomCode,
        players: { $size: 0 },
      });
      if (deletion.deletedCount > 0) {
        console.log(`Room ${roomCode} deleted — no players remaining.`);
        return true;
      }

      updatedBattle = await Battle.findOne({ roomCode });
      if (!updatedBattle) return true;
      if (updatedBattle.players.length === 0) return true;
    }

    socket.leave(roomCode);
    io.to(roomCode).emit("player-left", {
      username,
      message: `${username} has disconnected.`,
      players: updatedBattle.players,
      host: updatedBattle.host,
    });
    io.to(roomCode).emit("player-list-updated", {
      players: updatedBattle.players,
      host: updatedBattle.host,
    });
    console.log(`${username} ${reason} from room: ${roomCode}`);
    return true;
  }

  battle.players = battle.players.filter(player => player.username.toLowerCase() !== username.toLowerCase());
  const hostLeft = battle.host.toLowerCase() === username.toLowerCase();
  if (hostLeft && battle.players.length > 0) {
    battle.host = battle.players[0].username;
    io.to(roomCode).emit("host-changed", {
      newHost: battle.host,
      message: `${battle.host} is now the host.`
    });
    console.log(`Host transferred to: ${battle.host} in room: ${roomCode}`);
  }
  if (battle.players.length === 0) {
    await Battle.deleteOne({
      roomCode
    });
    try {
      await invalidateBattleCache(roomCode);
    } catch (cacheError) {
      console.error(
        "Player-leave cache invalidation failed:",
        cacheError?.message || cacheError
      );
    }

    console.log(`Room ${roomCode} deleted — no players remaining.`);
    return;
  }

  await battle.save();
  try {
    await invalidateBattleCache(roomCode);
  } catch (cacheError) {
    console.error(
      "Player-leave cache invalidation failed:",
      cacheError?.message || cacheError
    );
  }

  socket.leave(roomCode);
  io.to(roomCode).emit("player-left", {
    username,
    message: `${username} has ${reason === "disconnected" ? "disconnected" : "left the lobby"}.`,
    players: battle.players,
    host: battle.host
  });
  io.to(roomCode).emit("player-list-updated", {
    players: battle.players,
    host: battle.host
  });
  console.log(`${username} ${reason} from room: ${roomCode}`);
};