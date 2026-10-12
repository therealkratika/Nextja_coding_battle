const redis = require("../config/redis");

const GRACE_PERIOD_SECONDS = 30;
const PRESENCE_TTL_SECONDS = 60 * 60;

const disconnectCleanupTimers = new Map();

function normalizeRoomCode(roomCode) {
  if (typeof roomCode !== "string" || !roomCode.trim()) {
    throw new Error("A valid room code is required.");
  }

  return roomCode.trim().toUpperCase();
}

function normalizeUsername(username) {
  if (typeof username !== "string" || !username.trim()) {
    throw new Error("A valid username is required.");
  }

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

  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  const timer = setTimeout(async () => {
    if (disconnectCleanupTimers.get(identityKey) !== timer) {
      return;
    }

    disconnectCleanupTimers.delete(identityKey);

    try {
      await callback();
    } catch (error) {
      console.error(
        "Disconnect cleanup callback failed:",
        error?.message || error
      );
    }
  }, Math.max(0, delayMs));

  disconnectCleanupTimers.set(identityKey, timer);
  return timer;
}

/**
 * Register the player's current socket.
 */
async function markConnected({ roomCode, username, socketId }) {
  if (typeof socketId !== "string" || !socketId.trim()) {
    throw new Error("A valid socket ID is required.");
  }

  const client = redis.client;
  const normalizedRoomCode = normalizeRoomCode(roomCode);

  if (typeof username !== "string" || !username.trim()) {
    throw new Error("A valid username is required.");
  }

  const normalizedUsername = username.trim();

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

  await client.eval(
    `
      local currentSocketId = redis.call("GET", KEYS[1])

      redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[3])

      redis.call("SET", KEYS[3], ARGV[2], "EX", ARGV[3])

      redis.call("DEL", KEYS[2])

      if ARGV[4] ~= "" and
         ARGV[4] ~= ARGV[1] and
         currentSocketId == ARGV[4] then
        redis.call("DEL", ARGV[5])
      end

      return 1
    `,
    {
      keys: [mappingKey, presenceKey, newSocketKey],
      arguments: [
        socketId,
        JSON.stringify({
          roomCode: normalizedRoomCode,
          username: normalizedUsername,
        }),
        String(PRESENCE_TTL_SECONDS),
        oldSocketId || "",
        oldSocketId ? socketKey(oldSocketId) : "",
      ],
    }
  );

  cancelDisconnectCleanup(normalizedRoomCode, normalizedUsername);

  return true;
}

/**
 * Mark the player disconnected only if this socket is still current.
 */
async function markDisconnected(socketId) {
  if (typeof socketId !== "string" || !socketId.trim()) {
    return null;
  }

  const client = redis.client;
  const currentSocketKey = socketKey(socketId);

  const data = await client.get(currentSocketKey);

  if (!data) {
    return null;
  }

  let player;

  try {
    player = JSON.parse(data);

    if (
      typeof player.roomCode !== "string" ||
      typeof player.username !== "string"
    ) {
      throw new Error("Invalid socket metadata.");
    }
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

  const result = await client.eval(
    `
      if redis.call("GET", KEYS[1]) ~= ARGV[1] then
        return 0
      end

      redis.call("SET", KEYS[2], "disconnected", "EX", ARGV[2])

      return 1
    `,
    {
      keys: [mappingKey, presenceKey],
      arguments: [socketId, String(GRACE_PERIOD_SECONDS)],
    }
  );

  if (Number(result) !== 1) {
    // Remove only this socket's stale metadata.
    await client.eval(
      `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          redis.call("DEL", KEYS[1])
          return 1
        end

        return 0
      `,
      {
        keys: [currentSocketKey],
        arguments: [data],
      }
    );

    return null;
  }

  return {
    roomCode: normalizedRoomCode,
    username: player.username.trim(),
  };
}

/**
 * Check whether the socket still owns the player's mapping.
 */
async function isStillSameSocket(player, socketId) {
  const currentSocketId = await redis.client.get(
    playerSocketKey(player.roomCode, player.username)
  );

  return currentSocketId === socketId;
}

/**
 * Atomically claim disconnect cleanup.
 *
 * Redis mappings are removed only if this socket is still current.
 * Returns false if a newer socket has already replaced it.
 */
async function claimDisconnectCleanup(player, socketId) {
  const client = redis.client;

  const mappingKey = playerSocketKey(
    player.roomCode,
    player.username
  );

  const presenceKey = playerPresenceKey(
    player.roomCode,
    player.username
  );

  const currentSocketKey = socketKey(socketId);

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
      keys: [mappingKey, presenceKey, currentSocketKey],
      arguments: [socketId],
    }
  );

  return Number(result) === 1;
}

/**
 * Clear presence only if the mapping still belongs to this socket.
 */
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

  const currentSocketKey = socketKey(socketId);

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
      keys: [mappingKey, presenceKey, currentSocketKey],
      arguments: [socketId],
    }
  );

  return Number(result) === 1;
}

module.exports = {
  markConnected,
  markDisconnected,
  isStillSameSocket,
  claimDisconnectCleanup,
  clearPresence,
  scheduleDisconnectCleanup,
  cancelDisconnectCleanup,
  GRACE_PERIOD_SECONDS,
};
