import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  getSettings,
  updateSettings,
} from "../controllers/notification.controllers.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  getNotificationsQuerySchema,
  updateSettingsSchema,
} from "../validators/notification.validator.js";

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  validate(getNotificationsQuerySchema, "query"),
  getNotifications,
);

router.get("/unread-count", getUnreadCount);

router.patch("/:id/read", markAsRead);

router.patch("/read-all", markAllAsRead);

router.delete("/:id", deleteNotification);

router.delete("/read", deleteReadNotifications);

router.get("/settings", getSettings);

router.patch("/settings", validate(updateSettingsSchema), updateSettings);

export default router;
