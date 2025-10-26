import express from 'express';
import { getChallengeSubmissions, getIdeSubmissionById, reviewIdeSubmission } from '../controllers/ideSubmissionReviewController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/:id') // Nouvelle route pour récupérer une soumission par ID
  .get(requireAuth, requireRole(['admin', 'staff']), getIdeSubmissionById);

router.route('/challenges/:challengeId')
  .get(requireAuth, requireRole(['admin', 'staff']), getChallengeSubmissions);

router.route('/:id/review')
  .put(requireAuth, requireRole(['admin', 'staff']), reviewIdeSubmission);

export default router;
