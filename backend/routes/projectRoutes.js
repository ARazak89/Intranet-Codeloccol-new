import { Router } from "express";
import {
  createProject,
  getProjects,
  getStudentProjects,
  assignProjectToStudent,
  submitProjectSolution,
  finalReviewProject, // Renommé de approveProject
  getProjectsAwaitingStaffReview,
  getAllProjects, // Ajout du contrôleur pour récupérer tous les projets
  getCancelledProjects, // Ajout du contrôleur pour récupérer les projets annulés
  updateProject, // Ajout du contrôleur pour la mise à jour
  getProjectMarkdownContent, // Ajout du contrôleur pour récupérer le contenu Markdown
} from "../controllers/projectController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import uploadMarkdown from "../middlewares/markdownUploadMiddleware.js"; // Import du middleware d'upload Markdown
const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: API pour la gestion des projets (templates et assignations)
 */

// Routes pour le staff (création de templates, assignation, etc.)
/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Crée un nouveau projet template.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, description: "Titre du projet", example: "Projet CLI"
 *               description: { type: string, description: "Description détaillée du projet", example: "Ce projet introduit la ligne de commande."
 *               specifications: { type: array, items: { type: string }, description: "Liste des spécifications du projet"
 *               objectives: { type: array, items: { type: string }, description: "Liste des objectifs du projet"
 *               exerciseStatements: { type: array, items: { type: string }, description: "Liste des énoncés d'exercices"
 *               resourceLinks: { type: array, items: { type: string }, description: "Liens vers des ressources utiles"
 *               demoVideoUrl: { type: string, description: "URL d'une vidéo de démonstration (YouTube/Vimeo)"
 *               size: { type: string, enum: ["short", "medium", "long"], description: "Taille estimée du projet"
 *               module: { type: string, description: "Module auquel le projet appartient", example: "CLI/Git & GIt Hub"
 *               markdownFile: { type: string, format: binary, description: "Fichier Markdown pour la description détaillée"
 *     responses:
 *       201:
 *         description: Projet template créé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Erreur de validation ou données manquantes.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  "/",
  requireAuth,
  requireRole(["staff", "admin"]),
  uploadMarkdown.single('markdownFile'), // Gère l'upload du fichier Markdown et parse les champs de texte.
  createProject
); // Crée un projet template.

/**
 * @swagger
 * /api/projects/assign:
 *   post:
 *     summary: Assigne un projet template à un étudiant spécifique.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - projectId
 *             properties:
 *               studentId: { type: string, description: "ID de l'étudiant à qui assigner le projet"
 *               projectId: { type: string, description: "ID du projet template à assigner"
 *     responses:
 *       201:
 *         description: Projet assigné avec succès.
 *       400:
 *         description: Requête invalide ou étudiant déjà assigné.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul l'admin).
 *       404:
 *         description: Apprenant ou projet non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  "/assign",
  requireAuth,
  requireRole(["staff", "admin"]),
  assignProjectToStudent,
); // Assigne un projet à un étudiant.

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Met à jour les détails d'un projet maître existant (sans fichier Markdown).
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: L'ID du projet maître à mettre à jour.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectTitle: { type: string, description: "Nouveau titre du projet"
 *               projectDescription: { type: string, description: "Nouvelle description du projet"
 *               projectDemoVideoUrl: { type: string, description: "Nouvelle URL de la vidéo de démonstration"
 *               projectSpecifications: { type: array, items: { type: string }, description: "Nouvelles spécifications du projet"
 *               projectSize: { type: string, enum: ["short", "medium", "long"], description: "Nouvelle taille du projet"
 *               projectOrder: { type: number, description: "Nouvel ordre du projet"
 *               projectObjectives: { type: array, items: { type: string }, description: "Nouveaux objectifs du projet"
 *               projectExerciseStatements: { type: array, items: { type: string }, description: "Nouveaux énoncés d'exercices"
 *               projectResourceLinks: { type: array, items: { type: string }, description: "Nouveaux liens de ressources"
 *               projectModule: { type: string, description: "Nouveau module du projet"
 *     responses:
 *       200:
 *         description: Projet maître mis à jour avec succès.
 *       400:
 *         description: Requête invalide.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       404:
 *         description: Projet non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.put("/:id", requireAuth, requireRole(["staff", "admin"]), updateProject); // Met à jour un projet existant (sans upload de fichier).

/**
 * @swagger
 * /api/projects/{id}/upload-markdown:
 *   post:
 *     summary: Met à jour un projet existant et gère l'upload ou la suppression d'un fichier Markdown.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: L'ID du projet à mettre à jour.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               projectTitle: { type: string, description: "Titre du projet"
 *               projectDescription: { type: string, description: "Description du projet"
 *               projectDemoVideoUrl: { type: string, description: "URL de la vidéo de démonstration"
 *               projectSpecifications: { type: string, description: "Spécifications du projet (JSON stringifié)"
 *               projectSize: { type: string, enum: ["short", "medium", "long"], description: "Taille du projet"
 *               projectOrder: { type: number, description: "Ordre du projet"
 *               projectObjectives: { type: string, description: "Objectifs du projet (JSON stringifié)"
 *               projectExerciseStatements: { type: string, description: "Énoncés d'exercices (JSON stringifié)"
 *               projectResourceLinks: { type: string, description: "Liens de ressources (JSON stringifié)"
 *               projectModule: { type: string, description: "Module du projet"
 *               markdownFile: { type: string, format: binary, description: "Nouveau fichier Markdown à uploader"
 *               clearMarkdown: { type: string, enum: ["true"], description: "Passez 'true' pour supprimer le fichier Markdown existant sans en uploader un nouveau."
 *               assignmentId: { type: string, description: "ID de l'assignation si c'est une mise à jour d'assignation"
 *               repoUrl: { type: string, description: "URL du dépôt (pour les assignations)"
 *               status: { type: string, description: "Statut de l'assignation (pour les assignations)"
 *     responses:
 *       200:
 *         description: Projet mis à jour avec succès.
 *       400:
 *         description: Requête invalide.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       404:
 *         description: Projet non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.post(
  "/:id/upload-markdown",
  requireAuth,
  requireRole(["staff", "admin"]),
  uploadMarkdown.single('markdownFile'), // Gère l'upload du fichier Markdown et parse les champs de texte.
  updateProject
); // Gère l'upload de fichier Markdown et la mise à jour du projet.

/**
 * @swagger
 * /api/projects/{id}/markdown:
 *   get:
 *     summary: Récupère le contenu Markdown d'un projet spécifique.
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: L'ID du projet dont on veut récupérer le contenu Markdown.
 *     responses:
 *       200:
 *         description: Contenu Markdown du projet.
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 *               example: "# Titre du Markdown\nCeci est le contenu en Markdown."
 *       404:
 *         description: Fichier Markdown non trouvé pour ce projet ou sur le serveur.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/:id/markdown", getProjectMarkdownContent); // Récupère le contenu Markdown d'un projet.

// Routes pour les apprenants
/**
 * @swagger
 * /api/projects/my-projects:
 *   get:
 *     summary: Récupère la liste des projets assignés à l'apprenant connecté.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des projets de l'apprenant.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProject'
 *       401:
 *         description: Non authentifié.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/my-projects", requireAuth, getStudentProjects); // Récupère les projets assignés à l'apprenant connecté.

// Routes de soumission de projet par un apprenant
/**
 * @swagger
 * /api/projects/{id}/submit-solution:
 *   post:
 *     summary: Soumet la solution pour un projet assigné.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: L'ID du projet maître.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentId
 *               - repoUrl
 *               - selectedSlotIds
 *             properties:
 *               assignmentId: { type: string, description: "ID de l'assignation du projet"
 *               repoUrl: { type: string, description: "URL du dépôt GitHub de la solution"
 *               selectedSlotIds: { type: array, items: { type: string }, description: "IDs des 2 créneaux d'évaluation sélectionnés"
 *     responses:
 *       200:
 *         description: Solution soumise avec succès.
 *       400:
 *         description: Requête invalide (ex: URL GitHub invalide, moins de 2 points d'évaluation).
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul l'apprenant).
 *       404:
 *         description: Projet ou assignation non trouvé(e).
 *       500:
 *         description: Erreur serveur.
 */
router.post("/:id/submit-solution", requireAuth, requireRole(["apprenant"]), submitProjectSolution); // Soumet la solution d'un projet.

// Routes pour le staff/admin (lecture des projets templates)
/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Récupère la liste de tous les projets templates (sans assignations spécifiques).
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des projets templates.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       500:
 *         description: Erreur serveur.
 */
router.get("/", requireAuth, requireRole(["staff", "admin"]), getProjects); // Pour lister les projets templates.

/**
 * @swagger
 * /api/projects/{id}/final-review:
 *   post:
 *     summary: Approuve ou rejette la soumission finale d'un projet par un étudiant.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: L'ID du projet maître.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignmentId
 *               - status
 *             properties:
 *               assignmentId: { type: string, description: "ID de l'assignation du projet à évaluer"
 *               status: { type: string, enum: ["approved", "rejected"], description: "Nouveau statut de l'assignation"
 *     responses:
 *       200:
 *         description: Revue finale du projet effectuée avec succès.
 *       400:
 *         description: Requête invalide.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       404:
 *         description: Projet ou assignation non trouvé(e).
 *       500:
 *         description: Erreur serveur.
 */
router.post("/:id/final-review", requireAuth, requireRole(["staff", "admin"]), finalReviewProject); // Gère la revue finale (approbation/rejet) d'un projet.

/**
 * @swagger
 * /api/projects/awaiting-staff-review:
 *   get:
 *     summary: Récupère la liste des projets en attente de révision finale par le staff/admin.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des projets en attente de révision.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentProjectReview'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       500:
 *         description: Erreur serveur.
 */
router.get("/awaiting-staff-review", requireAuth, requireRole(["staff", "admin"]), getProjectsAwaitingStaffReview);

/**
 * @swagger
 * /api/projects/all:
 *   get:
 *     summary: Récupère tous les projets maîtres, y compris leurs assignations et les détails des étudiants.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste complète de tous les projets maîtres.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectWithAssignments'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       500:
 *         description: Erreur serveur.
 */
router.get("/all", requireAuth, requireRole(["staff", "admin"]), getAllProjects); // Récupère tous les projets maîtres.

/**
 * @swagger
 * /api/projects/cancelled:
 *   get:
 *     summary: Récupère la liste des projets annulés nécessitant potentiellement une réassignation.
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des projets annulés.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CancelledProject'
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Non autorisé (seul le staff/admin).
 *       500:
 *         description: Erreur serveur.
 */
router.get("/cancelled", requireAuth, requireRole(["staff", "admin"]), getCancelledProjects); // Récupère les projets annulés.

export default router;
