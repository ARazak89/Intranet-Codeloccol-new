import { Router } from 'express';
import {
  getUserActivities,
  getUserActivitiesById,
  getUserActivityStats,
  getUserActivityStatsById,
  getAllActivities
} from '../controllers/activityController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Routes pour les utilisateurs connectés (leurs propres activités)
router.get('/my-activities', requireAuth, getUserActivities);
router.get('/my-stats', requireAuth, getUserActivityStats);

// Routes pour admin/staff (activités d'autres utilisateurs)
router.get('/user/:userId', requireAuth, requireRole(['admin', 'staff']), getUserActivitiesById);
router.get('/user/:userId/stats', requireAuth, requireRole(['admin', 'staff']), getUserActivityStatsById);

// Route pour admin seulement (toutes les activités)
router.get('/all', requireAuth, requireRole(['admin']), getAllActivities);

export default router;
