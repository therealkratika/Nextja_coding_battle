
const redis = require("../config/redis");

const CACHE_TTL = 30; // seconds

function battleCacheKey(roomCode) {
  return `battle:${roomCode.trim().toUpperCase()}:details`;
}

async function getCachedBattle(roomCode) {
  const key = battleCacheKey(roomCode);
  const cached = await redis.client.get(key);

  if (!cached) return null;

  try {
    return JSON.parse(cached);
  } catch (error) {
    console.error("Invalid battle cache JSON:", error.message);

    try {
      await redis.client.del(key);
    } catch (deleteError) {
      console.error("Failed to delete invalid cache:", deleteError.message);
    }

    return null;
  }
}

async function cacheBattle(roomCode, battle) {
  const key = battleCacheKey(roomCode);

  await redis.client.set(
    key,
    JSON.stringify(battle),
    { EX: CACHE_TTL }
  );
}

async function invalidateBattleCache(roomCode) {
  await redis.client.del(battleCacheKey(roomCode));
}

module.exports = {
  getCachedBattle,
  cacheBattle,
  invalidateBattleCache,
};
