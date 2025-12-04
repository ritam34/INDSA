import { getIO } from "../config/websocket.config.js";
import logger from "../utils/logger.js";

export const setupSubmissionSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("subscribe:submission", (submissionId) => {
      socket.join(`submission:${submissionId}`);
      logger.debug(
        `User ${socket.userId} subscribed to submission ${submissionId}`,
      );

      socket.emit("subscribed:submission", {
        submissionId,
        message: "Successfully subscribed to submission updates",
      });
    });

    socket.on("unsubscribe:submission", (submissionId) => {
      socket.leave(`submission:${submissionId}`);
      logger.debug(
        `User ${socket.userId} unsubscribed from submission ${submissionId}`,
      );
    });

    socket.on("subscribe:problem", (problemId) => {
      socket.join(`problem:${problemId}`);
      logger.debug(`User ${socket.userId} subscribed to problem ${problemId}`);
    });

    socket.on("unsubscribe:problem", (problemId) => {
      socket.leave(`problem:${problemId}`);
      logger.debug(
        `User ${socket.userId} unsubscribed from problem ${problemId}`,
      );
    });
  });
};

export const emitSubmissionUpdate = (submissionId, userId, data) => {
  if (process.env.ENABLE_WEBSOCKET !== "true") return;

  try {
    const io = getIO();

    io.to(`submission:${submissionId}`).emit("submission:update", {
      submissionId,
      ...data,
      timestamp: new Date(),
    });

    io.to(`user:${userId}`).emit("submission:update", {
      submissionId,
      ...data,
      timestamp: new Date(),
    });

    logger.debug(`Emitted submission update for ${submissionId}`);
  } catch (error) {
    logger.error("Failed to emit submission update:", error);
  }
};

export const emitSubmissionStarted = (submissionId, userId, problemId) => {
  emitSubmissionUpdate(submissionId, userId, {
    status: "PENDING",
    message: "Submission is being processed...",
    problemId,
  });
};

export const emitSubmissionJudging = (submissionId, userId, testCase) => {
  emitSubmissionUpdate(submissionId, userId, {
    status: "JUDGING",
    message: `Running test case ${testCase}...`,
    currentTestCase: testCase,
  });
};

export const emitSubmissionCompleted = (submissionId, userId, result) => {
  emitSubmissionUpdate(submissionId, userId, {
    status: result.status,
    message: getStatusMessage(result.status),
    result: {
      status: result.status,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtime: result.time,
      memory: result.memory,
      score: result.score,
    },
  });
};

export const emitTestCaseResult = (submissionId, userId, testCaseResult) => {
  try {
    const io = getIO();

    io.to(`submission:${submissionId}`).emit("submission:testcase", {
      submissionId,
      testCase: testCaseResult.testcase,
      passed: testCaseResult.passed,
      runtime: testCaseResult.time,
      memory: testCaseResult.memory,
      timestamp: new Date(),
    });

    logger.debug(`Emitted test case result for submission ${submissionId}`);
  } catch (error) {
    logger.error("Failed to emit test case result:", error);
  }
};

export const emitSubmissionError = (submissionId, userId, error) => {
  emitSubmissionUpdate(submissionId, userId, {
    status: "INTERNAL_ERROR",
    message: "An error occurred while processing your submission",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};

export const emitRunCodeResult = (userId, result) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("code:run:result", {
      ...result,
      timestamp: new Date(),
    });

    logger.debug(`Emitted run code result for user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit run code result:", error);
  }
};

export const emitProblemStatsUpdate = (problemId, stats) => {
  try {
    const io = getIO();

    io.to(`problem:${problemId}`).emit("problem:stats:update", {
      problemId,
      stats,
      timestamp: new Date(),
    });

    logger.debug(`Emitted problem stats update for ${problemId}`);
  } catch (error) {
    logger.error("Failed to emit problem stats update:", error);
  }
};

const getStatusMessage = (status) => {
  const messages = {
    ACCEPTED: "Accepted! Great job!",
    WRONG_ANSWER: "Wrong Answer",
    TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
    RUNTIME_ERROR: "Runtime Error",
    COMPILE_ERROR: "Compilation Error",
    INTERNAL_ERROR: "Internal Error",
  };

  return messages[status] || "Processing...";
};

export default {
  setupSubmissionSocket,
  emitSubmissionUpdate,
  emitSubmissionStarted,
  emitSubmissionJudging,
  emitSubmissionCompleted,
  emitTestCaseResult,
  emitSubmissionError,
  emitRunCodeResult,
  emitProblemStatsUpdate,
};
