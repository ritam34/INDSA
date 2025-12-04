import { getIO } from "../config/websocket.config.js";
import { prisma } from "../config/database.config.js";
import logger from "../utils/logger.js";

export const setupContestSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join:contest", async (contestId) => {
      try {
        const participant = await prisma.contestParticipant.findUnique({
          where: {
            contestId_userId: {
              contestId,
              userId: socket.userId,
            },
          },
        });

        if (!participant) {
          socket.emit("contest:error", {
            message: "You are not registered for this contest",
          });
          return;
        }

        socket.join(`contest:${contestId}`);
        logger.info(`User ${socket.userId} joined contest ${contestId}`);

        const leaderboard = await getContestLeaderboard(contestId);
        socket.emit("contest:joined", {
          contestId,
          leaderboard,
          message: "Successfully joined contest room",
        });
      } catch (error) {
        logger.error("Failed to join contest:", error);
        socket.emit("contest:error", {
          message: "Failed to join contest room",
        });
      }
    });

    socket.on("leave:contest", (contestId) => {
      socket.leave(`contest:${contestId}`);
      logger.info(`User ${socket.userId} left contest ${contestId}`);
    });

    socket.on("contest:leaderboard:request", async (contestId) => {
      try {
        const leaderboard = await getContestLeaderboard(contestId);
        socket.emit("contest:leaderboard:update", {
          contestId,
          leaderboard,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error("Failed to fetch leaderboard:", error);
        socket.emit("contest:error", {
          message: "Failed to fetch leaderboard",
        });
      }
    });
  });
};

export const emitContestStart = (contestId, contest) => {
  try {
    const io = getIO();

    io.to(`contest:${contestId}`).emit("contest:started", {
      contestId,
      contest: {
        id: contest.id,
        title: contest.title,
        startTime: contest.startTime,
        endTime: contest.endTime,
        duration: contest.duration,
      },
      message: "Contest has started! Good luck! 🚀",
      timestamp: new Date(),
    });

    logger.info(`Contest ${contestId} started - notified participants`);
  } catch (error) {
    logger.error("Failed to emit contest start:", error);
  }
};

export const emitContestEnd = (contestId) => {
  try {
    const io = getIO();

    io.to(`contest:${contestId}`).emit("contest:ended", {
      contestId,
      message: "Contest has ended! Results are being calculated...",
      timestamp: new Date(),
    });

    logger.info(`Contest ${contestId} ended - notified participants`);
  } catch (error) {
    logger.error("Failed to emit contest end:", error);
  }
};

export const emitLeaderboardUpdate = async (
  contestId,
  updatedUserId = null,
) => {
  try {
    const io = getIO();
    const leaderboard = await getContestLeaderboard(contestId);

    io.to(`contest:${contestId}`).emit("contest:leaderboard:update", {
      contestId,
      leaderboard,
      updatedUserId,
      timestamp: new Date(),
    });

    logger.debug(`Leaderboard updated for contest ${contestId}`);
  } catch (error) {
    logger.error("Failed to emit leaderboard update:", error);
  }
};

export const emitContestSubmission = (contestId, userId, submission) => {
  try {
    const io = getIO();

    io.to(`contest:${contestId}`).emit("contest:submission", {
      contestId,
      userId,
      problemId: submission.problemId,
      status: submission.status,
      timestamp: new Date(),
    });

    logger.debug(`Contest submission event emitted for ${contestId}`);
  } catch (error) {
    logger.error("Failed to emit contest submission:", error);
  }
};

export const emitContestProblemSolved = (
  contestId,
  userId,
  problemId,
  rank,
) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("contest:problem:solved", {
      contestId,
      problemId,
      rank,
      message: "🎉 Problem solved!",
      timestamp: new Date(),
    });

    io.to(`contest:${contestId}`).emit("contest:problem:solved:broadcast", {
      contestId,
      userId,
      problemId,
      timestamp: new Date(),
    });

    logger.info(
      `User ${userId} solved problem ${problemId} in contest ${contestId}`,
    );
  } catch (error) {
    logger.error("Failed to emit contest problem solved:", error);
  }
};

export const emitContestAnnouncement = (contestId, announcement) => {
  try {
    const io = getIO();

    io.to(`contest:${contestId}`).emit("contest:announcement", {
      contestId,
      announcement,
      timestamp: new Date(),
    });

    logger.info(`Announcement sent to contest ${contestId}`);
  } catch (error) {
    logger.error("Failed to emit contest announcement:", error);
  }
};

export const emitContestCountdown = (contestId, timeRemaining) => {
  try {
    const io = getIO();

    io.to(`contest:${contestId}`).emit("contest:countdown", {
      contestId,
      timeRemaining,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to emit contest countdown:", error);
  }
};

export const emitContestResults = async (contestId) => {
  try {
    const io = getIO();
    const leaderboard = await getContestLeaderboard(contestId);

    io.to(`contest:${contestId}`).emit("contest:results", {
      contestId,
      leaderboard,
      message: "Final results are ready!",
      timestamp: new Date(),
    });

    logger.info(`Final results emitted for contest ${contestId}`);
  } catch (error) {
    logger.error("Failed to emit contest results:", error);
  }
};

const getContestLeaderboard = async (contestId, limit = 100) => {
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    orderBy: [{ score: "desc" }, { finishTime: "asc" }],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
        },
      },
    },
  });

  return participants.map((participant, index) => ({
    rank: index + 1,
    userId: participant.userId,
    username: participant.user.username,
    fullName: participant.user.fullName,
    avatar: participant.user.avatar,
    score: participant.score,
    finishTime: participant.finishTime,
  }));
};

export const broadcastToContest = (contestId, event, data) => {
  try {
    const io = getIO();
    io.to(`contest:${contestId}`).emit(event, {
      contestId,
      ...data,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to broadcast to contest:", error);
  }
};

export default {
  setupContestSocket,
  emitContestStart,
  emitContestEnd,
  emitLeaderboardUpdate,
  emitContestSubmission,
  emitContestProblemSolved,
  emitContestAnnouncement,
  emitContestCountdown,
  emitContestResults,
  broadcastToContest,
};
