const handlePlayerLeave = require("./handlePlayerLeave.js");
const {
  clearPresence,
} = require("../../services/playerPresence");

module.exports = function registerLeaveRoom(socket, io) {
  socket.on("leave-room", async ({
    roomCode,
    username
  }) => {
    try {
      if (!roomCode || !username) {
        return socket.emit("error", {
          message: "roomCode and username are required."
        });
      }
      const normalizedCode = roomCode.trim().toUpperCase();
      const normalizedUsername = username.trim();

      await handlePlayerLeave({
        socket,
        io,
        roomCode: normalizedCode,
        username: normalizedUsername,
        reason: "left"
      });

      await clearPresence(
        {
          roomCode: normalizedCode,
          username: normalizedUsername,
        },
        socket.id
      );
    } catch (error) {
      console.error("leave-room error:", error?.message || error);
      socket.emit("error", {
        message: "Server error while leaving room."
      });
    }
  });
};