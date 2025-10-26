import express from 'express';
import { upload, uploadChallengeImages } from '../controllers/uploadController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post(
  '/challenge-image',
  requireAuth,
  requireRole(['admin', 'staff']),
  upload.array('challengeImages', 5), // 'challengeImages' est le nom du champ de fichier, 5 est le nombre max d'images
  uploadChallengeImages
);

export default router;
