import morgan from "morgan";
import logger from "../utils/logger.js";

morgan.token("user-id", (req) => {
  return req.user?.id || "anonymous";
});

morgan.token("response-time-ms", (req, res) => {
  if (!req._startAt || !res._startAt) {
    return "0ms";
  }

  const ms =
    (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;

  return `${ms.toFixed(3)}ms`;
});

morgan.token("body", (req) => {
  if (req.method === "GET") return "";

  const sensitiveFields = ["password", "token", "secret", "apiKey"];
  const body = { ...req.body };

  sensitiveFields.forEach((field) => {
    if (body[field]) {
      body[field] = "***REDACTED***";
    }
  });

  return JSON.stringify(body);
});

morgan.token("query", (req) => {
  return Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : "";
});

const devFormat =
  ":method :url :status :response-time-ms - :user-id :body :query";

const prodFormat = JSON.stringify({
  method: ":method",
  url: ":url",
  status: ":status",
  contentLength: ":res[content-length]",
  responseTime: ":response-time-ms",
  userAgent: ":user-agent",
  userId: ":user-id",
  ip: ":remote-addr",
  body: ":body",
  query: ":query",
});

const skip = (req, res) => {
  return (
    req.url === "/health" ||
    req.url === "/health/live" ||
    req.url === "/health/ready"
  );
};

export const requestLogger = morgan(
  process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  {
    stream: logger.stream,
    skip,
  },
);

export const slowRequestLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;

      if (duration > threshold) {
        logger.warn("Slow Request Detected", {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          userId: req.user?.id,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        });
      }
    });

    next();
  };
};

export const largeResponseLogger = (threshold = 1024 * 1024) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      const size = Buffer.byteLength(JSON.stringify(data));

      if (size > threshold) {
        logger.warn("Large Response Detected", {
          method: req.method,
          url: req.originalUrl,
          size: `${(size / 1024 / 1024).toFixed(2)}MB`,
          userId: req.user?.id,
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};

export default requestLogger;
