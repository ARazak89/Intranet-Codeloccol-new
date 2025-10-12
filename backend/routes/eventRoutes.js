import { Router } from "express";
import {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
} from "../controllers/eventController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const r = Router();

// Routes accessibles à tous les utilisateurs authentifiés
r.get("/", requireAuth, getAllEvents); // Voir tous les événements
r.get("/:id", requireAuth, getEventById); // Voir un événement spécifique

// Routes réservées aux admin et staff
r.post("/", requireAuth, requireRole(["admin", "staff"]), createEvent); // Créer un événement
r.put("/:id", requireAuth, requireRole(["admin", "staff"]), updateEvent); // Modifier un événement
r.delete("/:id", requireAuth, requireRole(["admin", "staff"]), deleteEvent); // Supprimer un événement

export default r;

