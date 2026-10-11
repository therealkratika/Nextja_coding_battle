const redis = require("../config/redis");

async function acquireSubmissionLock(
  roomCode,
  username,
  questionId,
  token
) {
  const key =
    `lock:submission:${roomCode}:${username}:${questionId}`;

  const result = await redis.client.set(
    key,
    token,
    { NX: true, EX: 60 }
  );

  return result === "OK" ? key : null;
}

async function releaseSubmissionLock(key, token) {
  if (!key) return;

  await redis.client.eval(
    `if redis.call("GET", KEYS[1]) == ARGV[1] then
       return redis.call("DEL", KEYS[1])
     else
       return 0
     end`,
    {
      keys: [key],
      arguments: [token],
    }
  );
}

module.exports = {
  acquireSubmissionLock,
  releaseSubmissionLock,
};
