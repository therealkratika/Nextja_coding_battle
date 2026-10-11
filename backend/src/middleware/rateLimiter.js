const redis = require("../config/redis");

const RATE_LIMIT_SCRIPT = `
  local count = redis.call("INCR", KEYS[1])

  if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end

  local ttl = redis.call("TTL", KEYS[1])

  return { count, ttl }
`;

function createRateLimiter({
  windowSeconds = 60,
  maxRequests = 10,
  keyPrefix = "rate-limit",
} = {}) {
  return async function rateLimiter(req, res, next) {
    const identifier = req.user?.id
      ? `user:${req.user.id}`
      : `ip:${req.ip}`;

    const key = `${keyPrefix}:${identifier}`;
    let count;
    let ttl;

    try {
      [count, ttl] = await redis.client.eval(
        RATE_LIMIT_SCRIPT,
        {
          keys: [key],
          arguments: [String(windowSeconds)],
        }
      );
    } catch (error) {
      console.error(
        "Rate limiter Redis error:",
        error?.message || error
      );

      return res.status(503).json({
        success: false,
        message: "Request protection is temporarily unavailable.",
      });
    }

    res.set("RateLimit-Limit", String(maxRequests));
    res.set(
      "RateLimit-Remaining",
      String(Math.max(0, maxRequests - Number(count)))
    );

    if (Number(count) > maxRequests) {
      res.set(
        "Retry-After",
        String(Math.max(1, Number(ttl)))
      );

      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    return next();
  };
}

module.exports = createRateLimiter;
