const handlePlayerLeave = require("./handlePlayerLeave.js");

module.exports = function registerLeaveRoom(socket, io) {
  socket.on("leave-room", async ({ roomCode, username }) => {
    try {
      if (!roomCode || !username) {
        return socket.emit("error", { message: "roomCode and username are required." });
      }

      await handlePlayerLeave({
        socket,
        io,
        roomCode: roomCode.trim().toUpperCase(),
        username: username.trim(),
        reason: "left",
      });
    } catch (error) {
      console.error("leave-room error:", error?.message || error);
      socket.emit("error", { message: "Server error while leaving room." });
    }
  });
};
