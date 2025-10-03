import { Router } from "express";
import {
  createAvailabilitySlot,
  getAvailableSlots,
  bookSlot,
  getPeerBookings,
  getMyCreatedSlots,
  getAvailableSlotsForProject,
  deleteAvailabilitySlot, // Import the new controller function
  getAllAvailableSlots, // Import the new controller function
} from "../controllers/availabilityController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const r = Router();

// Routes pour la gestion des slots de disponibilité
r.post("/", requireAuth, requireRole(["apprenant"]), createAvailabilitySlot); // Un apprenant crée ses slots
r.get("/", requireAuth, getAvailableSlots); // Lister les slots disponibles (pour tout utilisateur authentifié)
r.get("/evaluator/:evaluatorId/available-slots", requireAuth, requireRole(["staff", "admin"]), getAvailableSlots); // Nouvelle route pour les slots d'un évaluateur spécifique
r.post("/book", requireAuth, requireRole(["apprenant"]), bookSlot); // Un apprenant réserve un slot
r.get("/my-bookings", requireAuth, requireRole(["apprenant"]), getPeerBookings); // Un évaluateur voit ses réservations
r.get("/mine", requireAuth, requireRole(["apprenant"]), getMyCreatedSlots); // Un apprenant voit les slots qu'il a créé
r.get("/available-for-project/:projectId/:assignmentId", requireAuth, requireRole(["apprenant"]), getAvailableSlotsForProject); // Récupérer les slots disponibles pour un projet spécifique
r.delete("/:id", requireAuth, requireRole(["apprenant", "staff", "admin"]), deleteAvailabilitySlot); // Nouvelle route pour supprimer un slot (par l'évaluateur qui l'a créé)
r.get("/all-available-slots", requireAuth, requireRole(["staff", "admin"]), getAllAvailableSlots); // Nouvelle route pour récupérer tous les slots disponibles

export default r;
