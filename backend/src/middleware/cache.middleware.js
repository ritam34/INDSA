import Redis from "ioredis";
import crypto from "crypto";
import logger from "../utils/logger.js";

let cacheClient = null;

if (process.env.ENABLE_REDIS_CACHE === "true") {
  cacheClient = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 2,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  cacheClient.on("error", (err) => {
    logger.error("Redis cache client error:", err);
  });

  cacheClient.on("connect", () => {
    logger.info("Redis cache connected");
  });
}

const generateCacheKey = (req) => {
  const { path, query, params } = req;
  const userId = req.user?.id || "anonymous";

  const keyData = {
    path,
    query,
    params,
    userId,
  };

  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(keyData))
    .digest("hex");

  return `cache:${hash}`;
};

/**
 * Cache middleware
 * @param {number} ttl - Time to live in seconds
 * @param {function} keyGenerator - Custom key generator function
 */
export const cache = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    if (!cacheClient) {
      return next();
    }

    if (req.method !== "GET") {
      return next();
    }

    try {
      const cacheKey = keyGenerator ? keyGenerator(req) : generateCacheKey(req);

      const cachedData = await cacheClient.get(cacheKey);

      if (cachedData) {
        logger.debug("Cache hit", { cacheKey, path: req.path });

        const parsed = JSON.parse(cachedData);

        res.set("X-Cache", "HIT");
        res.set("X-Cache-Key", cacheKey);

        return res.json(parsed);
      }

      logger.debug("Cache miss", { cacheKey, path: req.path });

      const originalJson = res.json.bind(res);

      res.json = (data) => {
        cacheClient
          .setex(cacheKey, ttl, JSON.stringify(data))
          .catch((err) => logger.error("Cache set error:", err));

        res.set("X-Cache", "MISS");
        res.set("X-Cache-TTL", ttl);

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error("Cache middleware error:", error);
      next();
    }
  };
};

export const clearCache = async (pattern = "*") => {
  if (!cacheClient) {
    logger.warn("Redis cache not available");
    return;
  }

  try {
    const keys = await cacheClient.keys(`cache:${pattern}`);

    if (keys.length > 0) {
      await cacheClient.del(...keys);
      logger.info(`Cleared ${keys.length} cache entries matching: ${pattern}`);
    }
  } catch (error) {
    logger.error("Clear cache error:", error);
  }
};

export const clearUserCache = async (userId) => {
  await clearCache(`*${userId}*`);
};

export const clearProblemCache = async (problemId) => {
  await clearCache(`*problems*${problemId}*`);
};

export const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          await clearCache(pattern);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

export const CACHE_DURATION = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 1800,
  VERY_LONG: 3600,
  DAY: 86400,
};

export const cacheStrategies = {
  problemList: cache(CACHE_DURATION.MEDIUM),

  problemDetails: cache(CACHE_DURATION.LONG),

  userStats: cache(CACHE_DURATION.SHORT),

  leaderboard: cache(CACHE_DURATION.MEDIUM),

  contestDetails: cache(CACHE_DURATION.SHORT),

  staticData: cache(CACHE_DURATION.VERY_LONG),
};

process.on("SIGTERM", async () => {
  if (cacheClient) {
    await cacheClient.quit();
    logger.info("Redis cache connection closed");
  }
});

export default {
  cache,
  clearCache,
  clearUserCache,
  clearProblemCache,
  invalidateCache,
  CACHE_DURATION,
  cacheStrategies,
};