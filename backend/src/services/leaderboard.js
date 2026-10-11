const redis = require("../config/redis");

function leaderboardKey(roomCode) {
  return `battle:${roomCode}:leaderboard`;
}

async function syncPlayerScore(roomCode, username, score) {
  const client = redis.client;

  return client.zAdd(leaderboardKey(roomCode), {
    score: Number(score) || 0,
    value: username,
  });
}

async function getLeaderboard(roomCode) {
  const client = redis.client;

  const entries = await client.zRangeWithScores(
    leaderboardKey(roomCode),
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
  await redis.client.del(leaderboardKey(roomCode));
}

module.exports = {
  syncPlayerScore,
  getLeaderboard,
  deleteLeaderboard,
};
