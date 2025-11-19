import express from 'express';
import { ideSubmitProject } from '../controllers/ideProjectSubmissionController.js';
import { requireAuth } from '../middlewares/authMiddleware.js'; // Assurez-vous d'importer votre middleware d'authentification

const router = express.Router();

router.route('/submit-project').post(requireAuth, ideSubmitProject);

export default router;
