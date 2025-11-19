import express from 'express';
import {
  createChallenge,
  getAllChallenges,
  getChallengeById,
  updateChallenge,
  deleteChallenge,
  getChallengeStats, // Added getChallengeStats
} from '../controllers/challengeController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js'; // Utiliser `requireAuth` et `requireRole`

const router = express.Router();

router.route('/')
  .post(requireAuth, requireRole(['admin', 'staff']), createChallenge) // Seuls les admins/staff peuvent créer un challenge
  .get(requireAuth, requireRole(['admin', 'staff', 'apprenant']), getAllChallenges); // Tous les utilisateurs peuvent lister les challenges (pour l'affichage dans l'IDE par exemple)

router.route('/:id')
  .get(requireAuth, requireRole(['admin', 'staff', 'apprenant']), getChallengeById) // Tous les utilisateurs peuvent voir un challenge spécifique
  .put(requireAuth, requireRole(['admin', 'staff']), updateChallenge) // Seuls les admins/staff peuvent modifier un challenge
  .delete(requireAuth, requireRole(['admin']), deleteChallenge); // Seuls les admins peuvent supprimer un challenge

router.route('/:id/stats')
  .get(requireAuth, requireRole(['admin', 'staff']), getChallengeStats); // Route pour obtenir les statistiques d'un challenge

export default router;
