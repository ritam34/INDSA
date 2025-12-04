import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "debug" : "info";
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      const { stack, ...otherMeta } = meta;
      if (Object.keys(otherMeta).length > 0) {
        msg += `\n${JSON.stringify(otherMeta, null, 2)}`;
      }
      if (stack && process.env.LOG_LEVEL === "debug") {
        msg += `\n${stack}`;
      }
    }

    return msg;
  }),
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),

  new DailyRotateFile({
    filename: path.join(process.cwd(), "logs", "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    format: logFormat,
    maxSize: "20m",
    maxFiles: "14d",
    zippedArchive: true,
  }),

  new DailyRotateFile({
    filename: path.join(process.cwd(), "logs", "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    format: logFormat,
    maxSize: "20m",
    maxFiles: "14d",
    zippedArchive: true,
  }),

  new DailyRotateFile({
    filename: path.join(process.cwd(), "logs", "http-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "http",
    format: logFormat,
    maxSize: "20m",
    maxFiles: "7d",
    zippedArchive: true,
  }),
];

if (process.env.NODE_ENV === "development") {
  transports.push(
    new DailyRotateFile({
      filename: path.join(process.cwd(), "logs", "debug-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "debug",
      format: logFormat,
      maxSize: "20m",
      maxFiles: "3d",
      zippedArchive: true,
    }),
  );
}

const logger = winston.createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

logger.logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    ...context,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
};

logger.database = (message, meta = {}) => {
  logger.info(message, { ...meta, context: "DATABASE" });
};

logger.auth = (message, meta = {}) => {
  logger.info(message, { ...meta, context: "AUTH" });
};

logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, context: "API" });
};

logger.websocket = (message, meta = {}) => {
  logger.info(message, { ...meta, context: "WEBSOCKET" });
};

logger.queue = (message, meta = {}) => {
  logger.info(message, { ...meta, context: "QUEUE" });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, context: "SECURITY" });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { ...meta, context: "PERFORMANCE" });
};

logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(process.cwd(), "logs", "exceptions-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
  }),
);

logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(process.cwd(), "logs", "rejections-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
  }),
);

export default logger;