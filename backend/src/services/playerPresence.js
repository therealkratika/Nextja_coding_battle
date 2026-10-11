
const redis = require("../config/redis");

const GRACE_PERIOD_SECONDS = 30;
const PRESENCE_TTL_SECONDS = 60 * 60;
const disconnectCleanupTimers = new Map();

function normalizeRoomCode(roomCode) {
  return roomCode.trim().toUpperCase();
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function playerSocketKey(roomCode, username) {
  return `battle:${normalizeRoomCode(roomCode)}:player:${normalizeUsername(username)}:socket`;
}

function playerPresenceKey(roomCode, username) {
  return `battle:${normalizeRoomCode(roomCode)}:player:${normalizeUsername(username)}:presence`;
}

function socketKey(socketId) {
  return `socket:${socketId}`;
}

function playerIdentityKey(roomCode, username) {
  return `${normalizeRoomCode(roomCode)}:${normalizeUsername(username)}`;
}

function cancelDisconnectCleanup(roomCode, username) {
  const identityKey = playerIdentityKey(roomCode, username);
  const timer = disconnectCleanupTimers.get(identityKey);

  if (timer) {
    clearTimeout(timer);
    disconnectCleanupTimers.delete(identityKey);
  }
}

function scheduleDisconnectCleanup(
  player,
  callback,
  delayMs = GRACE_PERIOD_SECONDS * 1000
) {
  const identityKey = playerIdentityKey(
    player.roomCode,
    player.username
  );
  const previousTimer = disconnectCleanupTimers.get(identityKey);

  if (previousTimer) clearTimeout(previousTimer);

  const timer = setTimeout(() => {
    if (disconnectCleanupTimers.get(identityKey) === timer) {
      disconnectCleanupTimers.delete(identityKey);
    }

    void callback();
  }, delayMs);

  disconnectCleanupTimers.set(identityKey, timer);
  return timer;
}

async function markConnected({ roomCode, username, socketId }) {
  const client = redis.client;
  const normalizedRoomCode = normalizeRoomCode(roomCode);
  const normalizedUsername = username.trim();

  cancelDisconnectCleanup(normalizedRoomCode, normalizedUsername);

  const mappingKey = playerSocketKey(
    normalizedRoomCode,
    normalizedUsername
  );
  const presenceKey = playerPresenceKey(
    normalizedRoomCode,
    normalizedUsername
  );
  const newSocketKey = socketKey(socketId);
  const oldSocketId = await client.get(mappingKey);

  const keys = [mappingKey, presenceKey, newSocketKey];
  const args = [
    socketId,
    JSON.stringify({
      roomCode: normalizedRoomCode,
      username: normalizedUsername,
    }),
    String(PRESENCE_TTL_SECONDS),
    oldSocketId && oldSocketId !== socketId
      ? socketKey(oldSocketId)
      : "",
  ];

  await client.eval(
    `
      redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[3])
      redis.call("SET", KEYS[3], ARGV[2], "EX", ARGV[3])
      redis.call("DEL", KEYS[2])

      if ARGV[4] ~= "" then
        redis.call("DEL", ARGV[4])
      end

      return 1
    `,
    { keys, arguments: args }
  );
}

async function markDisconnected(socketId) {
  const client = redis.client;
  const currentSocketKey = socketKey(socketId);
  const data = await client.get(currentSocketKey);

  if (!data) return null;

  let player;

  try {
    player = JSON.parse(data);
  } catch {
    await client.del(currentSocketKey);
    return null;
  }

  const normalizedRoomCode = normalizeRoomCode(player.roomCode);
  const normalizedUsername = player.username.trim();

  const mappingKey = playerSocketKey(
    normalizedRoomCode,
    normalizedUsername
  );
  const presenceKey = playerPresenceKey(
    normalizedRoomCode,
    normalizedUsername
  );

  // Only the currently registered socket can mark this player disconnected.
  const result = await client.eval(
    `
      if redis.call("GET", KEYS[1]) ~= ARGV[1] then
        return 0
      end

      redis.call("DEL", KEYS[2])
      redis.call("SET", KEYS[3], "disconnected", "EX", ARGV[2])
      return 1
    `,
    {
      keys: [mappingKey, currentSocketKey, presenceKey],
      arguments: [socketId, String(GRACE_PERIOD_SECONDS)],
    }
  );

  return Number(result) === 1 ? player : null;
}

async function isStillSameSocket(player, socketId) {
  const currentSocketId = await redis.client.get(
    playerSocketKey(player.roomCode, player.username)
  );

  return currentSocketId === socketId;
}

async function clearPresence(player, socketId) {
  const client = redis.client;

  const mappingKey = playerSocketKey(
    player.roomCode,
    player.username
  );
  const presenceKey = playerPresenceKey(
    player.roomCode,
    player.username
  );

  // Never remove a mapping belonging to a newer connection.
  const result = await client.eval(
    `
      if redis.call("GET", KEYS[1]) ~= ARGV[1] then
        return 0
      end

      redis.call("DEL", KEYS[1])
      redis.call("DEL", KEYS[2])
      redis.call("DEL", KEYS[3])
      return 1
    `,
    {
      keys: [mappingKey, presenceKey, socketKey(socketId)],
      arguments: [socketId],
    }
  );

  return Number(result) === 1;
}

module.exports = {
  markConnected,
  markDisconnected,
  isStillSameSocket,
  clearPresence,
  scheduleDisconnectCleanup,
  GRACE_PERIOD_SECONDS,
};
