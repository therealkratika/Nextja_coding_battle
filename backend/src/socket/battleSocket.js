const Battle = require("../model/battle.js");
const redis = require("../config/redis");

const registerJoinRoom = require("./handlers/joinRoom.js");
const registerPlayerReady = require("./handlers/playerReady.js");
const registerLeaveRoom = require("./handlers/leaveRoom.js");
const registerStartBattle = require("./handlers/startBattle.js");
const handlePlayerLeave = require("./handlers/handlePlayerLeave.js");

const battleSocket = (socket, io) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  registerJoinRoom(socket, io);
  registerPlayerReady(socket, io);
  registerLeaveRoom(socket, io);
  registerStartBattle(socket, io);

  socket.on("disconnect", async () => {
    try {
      const redisKey = `socket:${socket.id}`;
      const redisClient = redis.client;

      let playerInfo = await redisClient.get(redisKey);

      if (playerInfo) {
        playerInfo = JSON.parse(playerInfo);
      } else {
        const battle = await Battle.findOne({
          "players.socketId": socket.id,
        });

        if (battle) {
          const player = battle.players.find(
            (p) => p.socketId === socket.id
          );

          if (player) {
            playerInfo = {
              roomCode: battle.roomCode,
              username: player.username,
            };
          }
        }
      }

      if (playerInfo) {
        console.log(
          `⚠️ ${playerInfo.username} disconnected from room: ${playerInfo.roomCode}`
        );

        await handlePlayerLeave({
          socket,
          io,
          roomCode: playerInfo.roomCode,
          username: playerInfo.username,
          reason: "disconnected",
        });
      }

      await redisClient.del(redisKey);
    } catch (error) {
      console.error("disconnect cleanup error:", error?.message || error);
    }

    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
};

module.exports = battleSocket;