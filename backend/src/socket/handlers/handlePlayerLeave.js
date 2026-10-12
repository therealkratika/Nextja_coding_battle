const Battle = require("../../model/battle.js");
const {
  invalidateBattleCache,
} = require("../../services/battleCache");

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

module.exports = async function handlePlayerLeave({
  socket,
  io,
  roomCode,
  username,
  reason,
  expectedSocketId,
}) {
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const normalizedUsername = normalizeUsername(username);

  // Find the room using its normalized code.
  const battle = await Battle.findOne({
    roomCode: normalizedRoomCode,
  });

  if (!battle) {
    return false;
  }

  let updatedBattle;

  if (expectedSocketId) {
    /*
     * Disconnect cleanup:
     * Remove the player only if their stored socketId still matches
     * the socket that disconnected.
     *
     * This protects against deleting a player who reconnected using
     * a different socket ID.
     */
    const playerToRemove = battle.players.find(
      (player) =>
        normalizeUsername(player.username) === normalizedUsername
    );

    if (!playerToRemove || playerToRemove.socketId !== expectedSocketId) {
      return false;
    }

    const oldHost = battle.host;
    const hostLeft =
      normalizeUsername(oldHost) === normalizedUsername;

    // Determine the replacement host before removing the player.
    const remainingPlayers = battle.players.filter(
      (player) =>
        normalizeUsername(player.username) !== normalizedUsername
    );

    const nextHost = hostLeft
      ? remainingPlayers[0]?.username || null
      : oldHost;

    /*
     * Use a conditional update to guard against a socket change
     * between reading the battle and updating MongoDB.
     */
    const filter = {
      roomCode: normalizedRoomCode,
      players: {
        $elemMatch: {
          username: playerToRemove.username,
          socketId: expectedSocketId,
        },
      },
    };

    const update = {
      $pull: {
        players: {
          username: playerToRemove.username,
          socketId: expectedSocketId,
        },
      },
    };

    if (hostLeft && nextHost) {
      update.$set = { host: nextHost };
    }

    updatedBattle = await Battle.findOneAndUpdate(
      filter,
      update,
      { new: true }
    );

    if (!updatedBattle) {
      // The player/socket changed before the update could complete.
      return false;
    }

    // Delete an empty room only if it is still empty.
    if (updatedBattle.players.length === 0) {
      const deletion = await Battle.deleteOne({
        _id: updatedBattle._id,
        players: { $size: 0 },
      });

      if (deletion.deletedCount > 0) {
        try {
          await invalidateBattleCache(normalizedRoomCode);
        } catch (error) {
          console.error(
            "Player-leave cache invalidation failed:",
            error?.message || error
          );
        }

        console.log(
          `Room ${normalizedRoomCode} deleted — no players remaining.`
        );

        socket.leave(normalizedRoomCode);
        return true;
      }

      // The room changed after the update; fetch its current state.
      updatedBattle = await Battle.findOne({
        roomCode: normalizedRoomCode,
      });

      if (!updatedBattle) {
        return true;
      }
    }

    try {
      await invalidateBattleCache(normalizedRoomCode);
    } catch (error) {
      console.error(
        "Player-leave cache invalidation failed:",
        error?.message || error
      );
    }

    if (hostLeft && updatedBattle.players.length > 0) {
      io.to(normalizedRoomCode).emit("host-changed", {
        newHost: updatedBattle.host,
        message: `${updatedBattle.host} is now the host.`,
      });

      console.log(
        `Host transferred to: ${updatedBattle.host} in room: ${normalizedRoomCode}`
      );
    }

    socket.leave(normalizedRoomCode);

    io.to(normalizedRoomCode).emit("player-left", {
      username: playerToRemove.username,
      message:
        reason === "disconnected"
          ? `${playerToRemove.username} has disconnected.`
          : `${playerToRemove.username} has left the lobby.`,
      players: updatedBattle.players,
      host: updatedBattle.host,
    });

    io.to(normalizedRoomCode).emit("player-list-updated", {
      players: updatedBattle.players,
      host: updatedBattle.host,
    });

    console.log(
      `${playerToRemove.username} ${reason} from room: ${normalizedRoomCode}`
    );

    return true;
  }

  /*
   * Voluntary leave:
   * Remove the matching player without requiring a socket ID.
   */
  const playerToRemove = battle.players.find(
    (player) =>
      normalizeUsername(player.username) === normalizedUsername
  );

  if (!playerToRemove) {
    return false;
  }

  const hostLeft =
    normalizeUsername(battle.host) === normalizedUsername;

  const remainingPlayers = battle.players.filter(
    (player) =>
      normalizeUsername(player.username) !== normalizedUsername
  );

  const nextHost = hostLeft
    ? remainingPlayers[0]?.username || null
    : battle.host;

  const update = {
    $pull: {
      players: { username: playerToRemove.username },
    },
  };

  if (hostLeft && nextHost) {
    update.$set = { host: nextHost };
  }

  updatedBattle = await Battle.findOneAndUpdate(
    {
      roomCode: normalizedRoomCode,
      players: {
        $elemMatch: { username: playerToRemove.username },
      },
    },
    update,
    { new: true }
  );

  if (!updatedBattle) {
    return false;
  }

  if (updatedBattle.players.length === 0) {
    const deletion = await Battle.deleteOne({
      _id: updatedBattle._id,
      players: { $size: 0 },
    });

    if (deletion.deletedCount > 0) {
      try {
        await invalidateBattleCache(normalizedRoomCode);
      } catch (error) {
        console.error(
          "Player-leave cache invalidation failed:",
          error?.message || error
        );
      }

      socket.leave(normalizedRoomCode);

      console.log(
        `Room ${normalizedRoomCode} deleted — no players remaining.`
      );

      return true;
    }

    updatedBattle = await Battle.findOne({
      roomCode: normalizedRoomCode,
    });

    if (!updatedBattle) {
      return true;
    }
  }

  try {
    await invalidateBattleCache(normalizedRoomCode);
  } catch (error) {
    console.error(
      "Player-leave cache invalidation failed:",
      error?.message || error
    );
  }

  if (hostLeft && updatedBattle.players.length > 0) {
    io.to(normalizedRoomCode).emit("host-changed", {
      newHost: updatedBattle.host,
      message: `${updatedBattle.host} is now the host.`,
    });
  }

  socket.leave(normalizedRoomCode);

  io.to(normalizedRoomCode).emit("player-left", {
    username: playerToRemove.username,
    message:
      reason === "disconnected"
        ? `${playerToRemove.username} has disconnected.`
        : `${playerToRemove.username} has left the lobby.`,
    players: updatedBattle.players,
    host: updatedBattle.host,
  });

  io.to(normalizedRoomCode).emit("player-list-updated", {
    players: updatedBattle.players,
    host: updatedBattle.host,
  });

  console.log(
    `${playerToRemove.username} ${reason} from room: ${normalizedRoomCode}`
  );

  return true;
};