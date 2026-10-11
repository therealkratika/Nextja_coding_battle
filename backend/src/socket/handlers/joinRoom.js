
const Battle = require("../../model/battle.js");
const {
  markConnected,
} = require("../../services/playerPresence");

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

      let battle = await Battle.findOne({
        roomCode: normalizedCode,
      });

      if (!battle) {
        return socket.emit("error", {
          message: "Room not found.",
        });
      }

      const existingPlayer = battle.players.find(
        (p) =>
          p.username.toLowerCase() ===
          normalizedUsername.toLowerCase()
      );

      // Do not allow unknown users to join active battles either.
      // If spectators are supported, implement separate validation.
      if (!existingPlayer) {
        return socket.emit("error", {
          message:
            "Player not found in room. Please join via the join form first.",
        });
      }

      const updateResult = await Battle.updateOne(
        {
          roomCode: normalizedCode,
          players: {
            $elemMatch: {
              username: existingPlayer.username,
            },
          },
        },
        {
          $set: {
            "players.$.socketId": socket.id,
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        return socket.emit("error", {
          message:
            "Player is no longer in this room. Please rejoin the battle.",
        });
      }

      battle = await Battle.findOne({
        roomCode: normalizedCode,
      });
      const player = battle?.players.find(
        (battlePlayer) =>
          battlePlayer.username.toLowerCase() ===
          normalizedUsername.toLowerCase()
      );

      if (!battle || !player) {
        return socket.emit("error", {
          message:
            "Player is no longer in this room. Please rejoin the battle.",
        });
      }

      await markConnected({
        roomCode: normalizedCode,
        username: player.username,
        socketId: socket.id,
      });

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
