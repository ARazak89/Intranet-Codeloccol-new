import { Router } from "express";
import {
  listNotifications,
  markAsRead,
  deleteNotification,
  getNotificationsCount,
  markAllAsRead,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, listNotifications);
router.get("/mine", requireAuth, listNotifications);
router.get("/count", requireAuth, getNotificationsCount);
router.put("/:id/read", requireAuth, markAsRead);
router.put("/all/read", requireAuth, markAllAsRead);
router.delete("/:id", requireAuth, deleteNotification);

export default router;
