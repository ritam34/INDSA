import { emitToUser, emitToRoom } from "../config/websocket.config.js";
import logger from "./logger.js";

export const safeEmitToUser = (userId, event, data) => {
  if (process.env.ENABLE_WEBSOCKET !== "true") {
    logger.debug(`WebSocket disabled - skipping emit: ${event}`);
    return;
  }

  try {
    emitToUser(userId, event, data);
  } catch (error) {
    logger.error(`Failed to emit ${event} to user ${userId}:`, error);
  }
};

export const safeEmitToRoom = (room, event, data) => {
  if (process.env.ENABLE_WEBSOCKET !== "true") {
    logger.debug(`WebSocket disabled - skipping emit: ${event}`);
    return;
  }

  try {
    emitToRoom(room, event, data);
  } catch (error) {
    logger.error(`Failed to emit ${event} to room ${room}:`, error);
  }
};

export const isWebSocketEnabled = () => {
  return process.env.ENABLE_WEBSOCKET === "true";
};

export default {
  safeEmitToUser,
  safeEmitToRoom,
  isWebSocketEnabled,
};
