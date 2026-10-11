
const redis = require("../config/redis");
const Battle = require("../model/battle");

function leaderboardKey(roomCode) {
  return `battle:${roomCode.trim().toUpperCase()}:leaderboard`;
}

async function syncPlayerScore(roomCode, username, score) {
  if (!username || !username.trim()) {
    throw new Error("A valid username is required.");
  }

  const numericScore = Number(score);

  if (!Number.isFinite(numericScore)) {
    throw new Error("Player score must be a finite number.");
  }

  return redis.client.zAdd(leaderboardKey(roomCode), {
    score: numericScore,
    value: username.trim(),
  });
}

async function rebuildLeaderboard(roomCode) {
  const normalizedCode = roomCode.trim().toUpperCase();

  const battle = await Battle.findOne({
    roomCode: normalizedCode,
  }).lean();

  if (!battle) {
    return null;
  }

  const key = leaderboardKey(normalizedCode);

  // Rebuild the complete set from MongoDB.
  const members = (battle.players || []).map((player) => ({
    score: Number(player.score) || 0,
    value: player.username,
  }));

  // Replace stale or missing Redis data.
  await redis.client.del(key);

  if (members.length > 0) {
    await redis.client.zAdd(key, members);
  }

  return getLeaderboard(normalizedCode);
}

async function getLeaderboard(roomCode) {
  const key = leaderboardKey(roomCode);
  const client = redis.client;

  const exists = await client.exists(key);

  if (!exists) {
    const rebuilt = await rebuildLeaderboard(roomCode);
    return rebuilt || [];
  }

  const entries = await client.zRangeWithScores(
    key,
    0,
    -1,
    { REV: true }
  );

  return entries.map((entry, index) => ({
    rank: index + 1,
    username: entry.value,
    score: entry.score,
  }));
}

async function deleteLeaderboard(roomCode) {
  return redis.client.del(leaderboardKey(roomCode));
}

module.exports = {
  syncPlayerScore,
  getLeaderboard,
  deleteLeaderboard,
  rebuildLeaderboard,
};
