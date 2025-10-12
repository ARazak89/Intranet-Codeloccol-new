import { Router } from "express";
import {
  me,
  updateUserPassword,
  updateUserProfilePicture,
  updateOwnPersonalInfo,
  listUsers,
  getUserById,
  deleteUser,
  createUser,
  updateUser,
  toggleUserStatus,
  getEvaluators, // Importer la nouvelle fonction
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js"; // Importer le middleware d'upload

const r = Router();

r.get("/me", requireAuth, me);
// Routes pour la modification du profil par l'utilisateur
r.put("/me/info", requireAuth, updateOwnPersonalInfo); // Modifier le nom et l'email
r.put("/me/password", requireAuth, updateUserPassword); // Modifier le mot de passe

// Deux routes pour la photo de profil
r.put("/me/profile-picture/upload", requireAuth, upload.single("profilePicture"), updateUserProfilePicture); // Upload fichier
r.put("/me/profile-picture", requireAuth, updateUserProfilePicture); // Avatar prédéfini (JSON)

// Routes accessibles uniquement au staff/admin
r.post("/", requireAuth, requireRole(["staff", "admin"]), createUser); // Créer un utilisateur
r.put(
  "/:id", // Nouvelle route pour la mise à jour complète
  requireAuth,
  requireRole(["staff", "admin"]),
  updateUser, // Utiliser la fonction updateUser unifiée
);
r.get("/", requireAuth, listUsers); // Accessible à tous les utilisateurs authentifiés (pour sélection des responsables d'événements)
console.log('Registering /api/users/evaluators route...'); // Log avant la définition de la route
r.get(
  "/evaluators",
  requireAuth,
  requireRole(["staff", "admin"]),
  getEvaluators,
); // Nouvelle route pour les évaluateurs
r.get("/:id", requireAuth, requireRole(["staff", "admin"]), getUserById);
r.delete("/:id", requireAuth, requireRole(["admin"]), deleteUser);
r.put(
  "/:id/status",
  requireAuth,
  requireRole(["staff", "admin"]),
  toggleUserStatus,
);

export default r;
