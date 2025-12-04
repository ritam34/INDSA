import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

let io;

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.user = decoded;

      logger.info(`User ${decoded.username} connected via WebSocket`);
      next();
    } catch (error) {
      logger.error("WebSocket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

    socket.join(`user:${socket.userId}`);

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });

    socket.on("error", (error) => {
      logger.error(`Socket error: ${socket.id}`, error);
    });

    socket.emit("connected", {
      socketId: socket.id,
      userId: socket.userId,
      timestamp: new Date(),
    });
  });

  logger.info("WebSocket server initialized");
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (!io) {
    logger.warn("Socket.io not initialized - cannot emit event");
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
  logger.debug(`Emitted ${event} to user ${userId}`);
};

export const emitToRoom = (room, event, data) => {
  if (!io) {
    logger.warn("Socket.io not initialized - cannot emit event");
    return;
  }

  io.to(room).emit(event, data);
  logger.debug(`Emitted ${event} to room ${room}`);
};

export const broadcastEvent = (event, data) => {
  if (!io) {
    logger.warn("Socket.io not initialized - cannot broadcast event");
    return;
  }

  io.emit(event, data);
  logger.debug(`Broadcasted ${event} to all clients`);
};

export const getConnectedSocketsCount = async () => {
  if (!io) return 0;
  const sockets = await io.fetchSockets();
  return sockets.length;
};

export const getUserSockets = async (userId) => {
  if (!io) return [];
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets;
};

export const disconnectUser = async (userId) => {
  if (!io) return;
  const sockets = await getUserSockets(userId);
  sockets.forEach((socket) => {
    socket.disconnect(true);
  });
  logger.info(`Disconnected all sockets for user ${userId}`);
};

export default {
  initializeWebSocket,
  getIO,
  emitToUser,
  emitToRoom,
  broadcastEvent,
  getConnectedSocketsCount,
  getUserSockets,
  disconnectUser,
};
