import { prisma } from "../config/database.config.js";
import logger from "./logger.js";

export const logSlowQuery = (query, duration, threshold = 1000) => {
  if (duration > threshold) {
    logger.warn("Slow database query detected", {
      query,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
    });
  }
};

export const timedQuery = async (queryFn, queryName = "Unknown") => {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    logSlowQuery(queryName, duration);

    logger.debug("Query executed", {
      query: queryName,
      duration: `${duration}ms`,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error("Query failed", {
      query: queryName,
      duration: `${duration}ms`,
      error: error.message,
    });
    throw error;
  }
};

export const batchQuery = async (ids, fetchFn, batchSize = 100) => {
  const results = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await fetchFn(batch);
    results.push(...batchResults);
  }

  return results;
};

export const paginateWithCursor = async (model, options = {}) => {
  const {
    where = {},
    orderBy = { createdAt: "desc" },
    cursor = null,
    take = 20,
    select = undefined,
    include = undefined,
  } = options;

  const items = await prisma[model].findMany({
    where,
    orderBy,
    take: take + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select,
    include,
  });

  const hasNextPage = items.length > take;
  const results = hasNextPage ? items.slice(0, -1) : items;
  const nextCursor = hasNextPage ? results[results.length - 1].id : null;

  return {
    items: results,
    nextCursor,
    hasNextPage,
  };
};

export const optimizedPaginate = async (model, options = {}) => {
  const {
    where = {},
    orderBy = { createdAt: "desc" },
    page = 1,
    limit = 20,
    select = undefined,
    include = undefined,
  } = options;

  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma[model].count({ where }),
    prisma[model].findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select,
      include,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

export const bulkUpsert = async (model, data, uniqueField = "id") => {
  const operations = data.map((item) =>
    prisma[model].upsert({
      where: { [uniqueField]: item[uniqueField] },
      update: item,
      create: item,
    }),
  );

  return await Promise.all(operations);
};

export const safeTransaction = async (operations, maxRetries = 3) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const result = await prisma.$transaction(operations);
      return result;
    } catch (error) {
      retries++;

      if (retries >= maxRetries) {
        logger.error("Transaction failed after max retries", {
          error: error.message,
          retries,
        });
        throw error;
      }

      logger.warn("Transaction failed, retrying...", {
        error: error.message,
        retry: retries,
        maxRetries,
      });

      await new Promise((resolve) =>
        setTimeout(resolve, 100 * Math.pow(2, retries)),
      );
    }
  }
};

export class QueryBuilder {
  constructor(model) {
    this.model = model;
    this.where = {};
    this.orderBy = {};
    this.select = undefined;
    this.include = undefined;
    this.skip = undefined;
    this.take = undefined;
  }

  filter(conditions) {
    this.where = { ...this.where, ...conditions };
    return this;
  }

  search(fields, searchTerm) {
    if (!searchTerm) return this;

    this.where.OR = fields.map((field) => ({
      [field]: { contains: searchTerm, mode: "insensitive" },
    }));

    return this;
  }

  sort(field, order = "asc") {
    this.orderBy = { [field]: order };
    return this;
  }

  paginate(page, limit) {
    this.skip = (page - 1) * limit;
    this.take = limit;
    return this;
  }

  selectFields(fields) {
    this.select = fields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    return this;
  }

  includeRelations(relations) {
    this.include = relations;
    return this;
  }

  async execute() {
    return await prisma[this.model].findMany({
      where: this.where,
      orderBy: this.orderBy,
      select: this.select,
      include: this.include,
      skip: this.skip,
      take: this.take,
    });
  }

  async count() {
    return await prisma[this.model].count({
      where: this.where,
    });
  }

  async executeWithCount() {
    const [items, total] = await Promise.all([this.execute(), this.count()]);

    return { items, total };
  }
}

export const monitorConnectionPool = () => {
  setInterval(async () => {
    try {
      const metrics = await prisma.$metrics.json();

      logger.performance("Database connection pool metrics", {
        activeConnections:
          metrics.counters?.find(
            (c) => c.key === "prisma_client_queries_active",
          )?.value || 0,
        totalQueries:
          metrics.counters?.find((c) => c.key === "prisma_client_queries_total")
            ?.value || 0,
      });
    } catch (error) {
      logger.debug("Could not fetch connection pool metrics");
    }
  }, 60000);
};

export const checkDatabaseHealth = async () => {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    return {
      healthy: true,
      latency: duration,
      status: duration < 100 ? "excellent" : duration < 500 ? "good" : "slow",
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
};

export const cleanupOldRecords = async (
  model,
  field = "createdAt",
  daysOld = 90,
) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma[model].deleteMany({
    where: {
      [field]: {
        lt: cutoffDate,
      },
      deletedAt: {
        not: null,
      },
    },
  });

  logger.info(`Cleaned up ${result.count} old records from ${model}`);
  return result.count;
};

export default {
  timedQuery,
  batchQuery,
  paginateWithCursor,
  optimizedPaginate,
  bulkUpsert,
  safeTransaction,
  QueryBuilder,
  monitorConnectionPool,
  checkDatabaseHealth,
  cleanupOldRecords,
};
