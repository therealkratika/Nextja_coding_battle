const redis = require("../config/redis");

const GRACE_PERIOD_SECONDS = 30;
const PRESENCE_TTL_SECONDS = 60 * 60;

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function playerSocketKey(roomCode, username) {
  return `battle:${roomCode}:player:${normalizeUsername(username)}:socket`;
}

function playerPresenceKey(roomCode, username) {
  return `battle:${roomCode}:player:${normalizeUsername(username)}:presence`;
}

function socketKey(socketId) {
  return `socket:${socketId}`;
}

async function markConnected({
  roomCode,
  username,
  socketId,
}) {
  const client = redis.client;

  await client.set(
    playerSocketKey(roomCode, username),
    socketId,
    { EX: PRESENCE_TTL_SECONDS }
  );

  await client.set(
    socketKey(socketId),
    JSON.stringify({
      roomCode,
      username,
    }),
    { EX: PRESENCE_TTL_SECONDS }
  );

  await client.del(playerPresenceKey(roomCode, username));
}

async function markDisconnected(socketId) {
  const client = redis.client;
  const key = socketKey(socketId);
  const data = await client.get(key);

  if (!data) return null;

  const player = JSON.parse(data);
  const currentSocketId = await client.get(
    playerSocketKey(player.roomCode, player.username)
  );

  await client.del(key);

  if (currentSocketId !== socketId) return null;

  await client.set(
    playerPresenceKey(player.roomCode, player.username),
    "disconnected",
    { EX: GRACE_PERIOD_SECONDS }
  );

  return player;
}

async function isStillSameSocket(player, socketId) {
  const currentSocketId = await redis.client.get(
    playerSocketKey(player.roomCode, player.username)
  );

  return currentSocketId === socketId;
}

async function clearPresence(player, socketId) {
  const client = redis.client;
  const currentSocketId = await client.get(
    playerSocketKey(player.roomCode, player.username)
  );

  if (currentSocketId !== socketId) return false;

  await client.del(
    playerSocketKey(player.roomCode, player.username)
  );
  await client.del(playerPresenceKey(player.roomCode, player.username));
  await client.del(socketKey(socketId));

  return true;
}

module.exports = {
  markConnected,
  markDisconnected,
  isStillSameSocket,
  clearPresence,
  GRACE_PERIOD_SECONDS,
};
