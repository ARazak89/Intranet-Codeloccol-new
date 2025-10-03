import { Router } from "express";
import {
  getEvaluationsForMySubmittedProjects,
  getPendingEvaluationsAsEvaluator,
  submitEvaluation,
  getAllEvaluationsForStaff, // Mettre à jour l'importation
  reassignEvaluationManually, // Importer la nouvelle fonction
} from "../controllers/evaluationController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const r = Router();

r.get(
  "/mine",
  requireAuth,
  requireRole(["apprenant"]),
  getEvaluationsForMySubmittedProjects,
);
r.get(
  "/pending-as-evaluator",
  requireAuth,
  requireRole(["apprenant", "staff", "admin"]),
  getPendingEvaluationsAsEvaluator,
);
r.get(
  "/all-for-staff", // Changer le chemin
  requireAuth,
  requireRole(["staff", "admin"]),
  getAllEvaluationsForStaff,
);
r.post(
  "/:evaluationId/submit",
  requireAuth,
  requireRole(["apprenant"]),
  submitEvaluation,
);
r.put(
  "/:evaluationId/reassign", // Nouvelle route pour la réassignation
  requireAuth,
  requireRole(["staff", "admin"]),
  reassignEvaluationManually,
);

export default r;
