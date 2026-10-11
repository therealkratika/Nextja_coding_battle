const registerJoinRoom = require("./handlers/joinRoom.js");
const registerPlayerReady = require("./handlers/playerReady.js");
const registerLeaveRoom = require("./handlers/leaveRoom.js");
const registerStartBattle = require("./handlers/startBattle.js");
const handlePlayerLeave = require("./handlers/handlePlayerLeave.js");
const {
  markDisconnected,
  isStillSameSocket,
  clearPresence,
  GRACE_PERIOD_SECONDS,
} = require("../services/playerPresence");

const battleSocket = (socket, io) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  registerJoinRoom(socket, io);
  registerPlayerReady(socket, io);
  registerLeaveRoom(socket, io);
  registerStartBattle(socket, io);

  socket.on("disconnect", async () => {
    try {
      const player = await markDisconnected(socket.id);

      if (!player) {
        console.log(`Socket disconnected: ${socket.id}`);
        return;
      }

      console.log(
        `⚠️ ${player.username} temporarily disconnected from ${player.roomCode}`
      );

      setTimeout(async () => {
        try {
          const stillSameSocket = await isStillSameSocket(
            player,
            socket.id
          );

          if (!stillSameSocket) return;

          await handlePlayerLeave({
            socket,
            io,
            roomCode: player.roomCode,
            username: player.username,
            reason: "disconnected",
          });

          await clearPresence(player, socket.id);

          console.log(
            `Player ${player.username} did not reconnect within ${GRACE_PERIOD_SECONDS}s`
          );
        } catch (error) {
          console.error(
            "Delayed disconnect cleanup error:",
            error?.message || error
          );
        }
      }, GRACE_PERIOD_SECONDS * 1000);
    } catch (error) {
      console.error(
        "Disconnect handler error:",
        error?.message || error
      );
    }
  });
};

module.exports = battleSocket;
