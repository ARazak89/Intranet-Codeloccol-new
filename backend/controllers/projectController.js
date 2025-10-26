import Project from "../models/Project.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import User from "../models/User.js";
import Evaluation from "../models/Evaluation.js";
import ActivityLogger from "../utils/activityLogger.js";
import uploadMarkdown from "../middlewares/markdownUploadMiddleware.js"; // Import du nouveau middleware
import fs from "fs"; // Nécessaire pour lire les fichiers Markdown
import path from "path"; // Nécessaire pour gérer les chemins de fichiers
import { fileURLToPath } from "url";
import Notification from "../models/Notification.js"; // Import du nouveau modèle Notification
import Badge from "../models/Badge.js"; // Import du nouveau modèle Badge
import mongoose from 'mongoose'; // Import de mongoose

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constantes pour une meilleure maintenabilité
const PROJECT_STATUS = {
  TEMPLATE: "template"
};

const ASSIGNMENT_STATUS = {
  ASSIGNED: "assigned"
};

const ERROR_MESSAGES = {
  STUDENT_NOT_FOUND: "Apprenant non trouvé.",
  NO_PROJECT_AVAILABLE: "Aucun projet suivant disponible.",
  INTERNAL_ERROR: "Erreur interne du serveur lors de l'assignation du projet.",
  INVALID_INPUT: "Paramètres d'entrée invalides."
};

/**
 * Fonction utilitaire pour obtenir les IDs des collaborateurs à partir des URLs GitHub.
 * @param {string[]} collaboratorUrls - Un tableau d'URLs de profils GitHub.
 * @returns {Promise<string[]>} Un tableau d'IDs d'utilisateurs (MongoDB ObjectIds).
 */
async function getCollaboratorIds(collaboratorUrls) {
  const collaboratorIds = [];
  for (const url of collaboratorUrls) {
    try {
      // Extraire le nom d'utilisateur GitHub de l'URL
      const usernameMatch = url.match(/github\.com\/([^/]+)/);
      if (!usernameMatch || !usernameMatch[1]) {
        console.warn(`URL de collaborateur invalide ignorée : ${url}`);
        continue;
      }
      const githubUsername = usernameMatch[1];

      // Trouver l'utilisateur correspondant dans la base de données
      const user = await User.findOne({ githubUsername: githubUsername });
      if (user) {
        collaboratorIds.push(user._id);
      } else {
        console.warn(
          `Utilisateur GitHub \'${githubUsername}\' non trouvé dans la base de données pour l'URL : ${url}`
        );
      }
    } catch (error) {
      console.error(
        `Erreur lors du traitement de l'URL du collaborateur ${url}:`,
        error
      );
    }
  }
  return collaboratorIds;
}

// Mappage des niveaux aux modules correspondants. Utilisé pour l'assignation automatique de projets.
export const levelToModuleMap = {
  1: "CLI/Git & GIt Hub",
  2: "HTML / CSS",
  3: "Framework",
  4: "WordPress",
  5: "JavaScript",
  6: "Node Js (API)",
  7: "React JS",
  8: "Electron JS",
  9: "Mobile",
  10: "Full Stack",
  11: "Soft Skills",
};

// Mappage des noms de module aux noms de badges correspondants
const moduleToBadgeNameMap = {
  "CLI/Git & GIt Hub": "Badge CLI/Git",
  "HTML / CSS": "Badge HTML/CSS",
  "Framework": "Badge Framework",
  "WordPress": "Badge WordPress",
  "JavaScript": "Badge JavaScript",
  "Node Js (API)": "Badge Node Js",
  "React JS": "Badge React JS",
  "Electron JS": "Badge Electron JS",
  "Mobile": "Badge Mobile",
  "Full Stack": "Badge Full Stack",
  "Soft Skills": "Badge Soft Skills",
};

/**
 * Valide une URL GitHub pour s'assurer qu'elle correspond au format attendu.
 * @param {string} url - L'URL GitHub à valider.
 * @returns {boolean} `true` si l'URL est valide, `false` sinon.
 */
function validateGithubUrl(url) {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+(\.git)?$/.test(url);
}

/**
 * Valide une URL GitHub Pages pour s'assurer qu'elle correspond au format attendu.
 * @param {string} url - L'URL GitHub Pages à valider.
 * @returns {boolean} `true` si l'URL est valide, `false` sinon.
 */
function validateGithubPagesUrl(url) {
  // Regex pour les URLs GitHub Pages (username.github.io/repo/ ou docs/index.html)
  return /^(https?:\/\/)?([a-zA-Z0-9-]+(?=\.github\.io)|[a-zA-Z0-9-]+(?:-[a-zA-Z0-9-]+)*)\.github\.io(\/[^\s\\]*)?$/i.test(
    url
  );
}

/**
 * Assigner automatiquement le projet suivant à un apprenant
 * basé sur l'ordre du projet qui vient d'être approuvé
 * 
 * @param {string} studentId - ID de l'apprenant
 * @param {Object} approvedProject - Projet qui vient d'être approuvé
 * @returns {Object} Résultat de l'assignation
 */
export async function assignNextProject(studentId, approvedProject) {
  // Validation des paramètres d'entrée
  if (!isValidInput(studentId, approvedProject)) {
    return { error: ERROR_MESSAGES.INVALID_INPUT };
  }

  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();

    // Récupérer l'apprenant avec ses assignments
    const student = await getUserWithAssignments(studentId, session);
    if (!student) {
      return { error: ERROR_MESSAGES.STUDENT_NOT_FOUND };
    }
    console.log(`Projet approuvé (ordre): ${approvedProject.order}`);

    // Calculer l'ordre du prochain projet
    const nextOrder = approvedProject.order + 1;
    console.log(`Ordre calculé du prochain projet: ${nextOrder}`);
    
    // Trouver le prochain projet disponible
    const nextProject = await findNextAvailableProject(studentId, nextOrder, session);
    if (!nextProject) {
      console.log(`Aucun projet suivant trouvé après l'ordre ${approvedProject.order}`);
      return { 
        error: `${ERROR_MESSAGES.NO_PROJECT_AVAILABLE} Après l'ordre ${approvedProject.order}` 
      };
    }
    console.log(`Projet suivant trouvé: ${nextProject.title} (ordre ${nextProject.order})`);

    // Assigner le projet à l'apprenant
    await assignProjectToStudentByOrder(nextProject, studentId, session);
    
    // Mettre à jour la liste des projets de l'apprenant
    await updateStudentProjects(student, nextProject._id, session);

    // Ancienne logique de mise à jour du module et de la progression - Supprimée

    await session.commitTransaction();

    logSuccess(student.name, nextProject.title, nextOrder);
    
    return { 
      success: true,
      message: "Projet suivant assigné avec succès.", 
      project: nextProject 
    };

  } catch (error) {
    await session.abortTransaction();
    console.error(`Erreur lors de l'assignation du projet suivant pour l'apprenant ${studentId}:`, error);
    return { error: ERROR_MESSAGES.INTERNAL_ERROR };
  } finally {
    await session.endSession();
  }
}

/**
 * Valider les paramètres d'entrée
 */
function isValidInput(studentId, approvedProject) {
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    console.error("ID d'étudiant invalide:", studentId);
    return false;
  }
  
  if (!approvedProject || typeof approvedProject.order !== 'number' || approvedProject.order < 0) {
    console.error("Projet approuvé invalide ou ordre manquant:", approvedProject);
    return false;
  }
  
  return true;
}

/**
 * Récupérer l'utilisateur avec ses assignments
 */
async function getUserWithAssignments(studentId, session) {
  return await User.findById(studentId)
    .session(session)
    .select('name projects'); // Ne pas sélectionner 'assignments' ici
}

/**
 * Trouver le prochain projet disponible selon l'ordre
 */
async function findNextAvailableProject(studentId, nextOrder, session) {
  // Récupérer tous les projectId pour lesquels l'étudiant a déjà une assignation (qu'importe le statut)
  const assignedProjects = await Project.find({
    "assignments.student": studentId,
  }).session(session);

  const assignedProjectIds = assignedProjects.flatMap(project => 
    project.assignments
      .filter(assign => assign.student.equals(studentId))
      .map(assign => project._id.toString())
  );

  // Recherche directe par ordre +1
  const nextProject = await Project.findOne({
    status: PROJECT_STATUS.TEMPLATE,
    order: nextOrder,
    _id: { $nin: assignedProjectIds }
  }).session(session);

  if (nextProject) {
    console.log(`Projet suivant trouvé par ordre incrémenté: ${nextProject.title} (ordre ${nextOrder})`);
    return nextProject;
  }

  // Fallback: chercher le plus petit ordre supérieur disponible
  const fallbackProject = await Project.findOne({
    status: PROJECT_STATUS.TEMPLATE,
    order: { $gt: nextOrder },
    _id: { $nin: assignedProjectIds }
  })
  .session(session)
  .sort({ order: 1 });

  if (fallbackProject) {
    console.log(`Projet de fallback trouvé: ${fallbackProject.title} (ordre ${fallbackProject.order})`);
    return fallbackProject;
  }

  console.warn(`Aucun projet disponible après l'ordre ${nextOrder} pour l'apprenant ${studentId}`);
  return null;
}

/**
 * Assigner le projet à l'étudiant
 */
async function assignProjectToStudentByOrder(project, studentId, session) {
  project.assignments.push({
    student: studentId,
    status: ASSIGNMENT_STATUS.ASSIGNED,
    repoUrl: "",
    evaluations: [],
    peerEvaluators: [],
    staffValidator: null,
  });
  
  await project.save({ session });
}

/**
 * Mettre à jour la liste des projets de l'étudiant
 */
async function updateStudentProjects(student, projectId, session) {
  const projectIdStr = projectId.toString();
  
  if (!student.projects.some(projId => projId.toString() === projectIdStr)) {
    student.projects.push(projectId);
    await student.save({ session });
  }
}

/**
 * Logger le succès de l'opération
 */
function logSuccess(studentName, projectTitle, order) {
  console.log(
    `Projet suivant '${projectTitle}' (ordre ${order}) assigné avec succès à l'apprenant ${studentName}.`
  );
}

// Fonctions de contrôleur de projet
/**
 * `createProject` gère la création d'un nouveau projet template par le staff/admin.
 * Il gère également l'upload optionnel d'un fichier Markdown pour les spécifications du projet.
 * @param {object} req - L'objet requête Express (contient les données du formulaire et le fichier uploadé).
 * @param {object} res - L'objet réponse Express.
 */
export async function createProject(req, res) {
  try {
    const markdownFile = req.file; // Fichier Markdown uploadé par Multer (si présent).
    const {
      title,
      description,
      specifications,
      objectives,
      exerciseStatements,
      resourceLinks,
      demoVideoUrl,
      size,
      module,
    } = req.body;

    // Calculer le prochain numéro d'ordre disponible pour le nouveau projet template.
    const latestProject = await Project.findOne({ status: "template" }).sort({
      order: -1,
    });
    const newOrder = latestProject ? latestProject.order + 1 : 1;
    console.log(`Calculated new project order: ${newOrder}`);

    const newProject = await Project.create({
      title,
      description,
      specifications,
      objectives,
      exerciseStatements,
      resourceLinks,
      demoVideoUrl,
      size,
      status: "template",
      order: newOrder, // Assigner l'ordre calculé.
      module, // Assigner le module.
      markdownFilePath: markdownFile
        ? `/uploads/project_markdowns/${markdownFile.filename}`
        : undefined, // Sauvegarder le chemin du fichier Markdown.
    });
    console.log("New project created:", newProject);

    res.status(201).json({
      message: "Projet template créé avec succès.",
      project: newProject,
    });
  } catch (e) {
    console.error("Error creating project template:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `updateProject` gère la mise à jour d'un projet existant (maître ou assignation) par le staff/admin.
 * Gère également l'upload d'un nouveau fichier Markdown ou la suppression d'un fichier existant.
 * @param {object} req - L'objet requête Express (contient l'ID du projet, les données du formulaire, et le fichier uploadé).
 * @param {object} res - L'objet réponse Express.
 */
export async function updateProject(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet à modifier.
    const markdownFile = req.file; // Fichier Markdown uploadé par Multer (si présent).
    const {
      assignmentId,
      projectTitle,
      projectDescription,
      projectDemoVideoUrl,
      projectSpecifications,
      projectSize,
      projectOrder,
      projectObjectives,
      projectExerciseStatements,
      projectResourceLinks,
      repoUrl,
      status,
      projectModule,
      clearMarkdown,
    } = req.body; // Ajouter clearMarkdown ici

    if (assignmentId) {
      // Logique pour la mise à jour d'une assignation spécifique.
      const project = await Project.findOneAndUpdate(
        { _id: projectId, "assignments._id": assignmentId },
        {
          $set: {
            "assignments.$.repoUrl": repoUrl,
            "assignments.$.status": status,
          },
        },
        { new: true, runValidators: true }
      );

      if (!project) {
        return res
          .status(404)
          .json({ error: "Projet maître ou assignation non trouvée." });
      }
      return res.status(200).json({
        message: "Assignation de projet mise à jour avec succès.",
        project,
      });
    } else {
      // Logique pour la mise à jour du projet maître.
      const existingProject = await Project.findById(projectId); // Récupère le projet existant une seule fois.
      if (!existingProject) {
        return res.status(404).json({ error: "Projet maître non trouvé." });
      }

      // Utilitaire local: rendre le parsing tolérant aux formats (Array direct, JSON string, CSV, simple string)
      const safelyParseArrayField = (raw) => {
        if (raw === undefined || raw === null) return [];
        if (Array.isArray(raw))
          return raw
            .filter(
              (v) => v !== undefined && v !== null && String(v).trim() !== ""
            )
            .map((v) => String(v).trim());
        const text = String(raw).trim();
        if (text === "") return [];
        // Si la chaîne ressemble à du JSON, tenter de parser
        if (
          (text.startsWith("[") && text.endsWith("]")) ||
          (text.startsWith("{") && text.endsWith("}"))
        ) {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
            // objet unique => l'encapsuler pour conserver l'API
            return [parsed];
          } catch {
            // Tomber plus bas sur CSV/unique string
          }
        }
        // Support CSV
        if (text.includes(",")) {
          return text
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== "");
        }
        // Sinon, considérer comme un seul élément
        return [text];
      };

      const coerceNumber = (val) => {
        if (val === undefined || val === null || val === "") return undefined;
        const n = Number(val);
        return Number.isNaN(n) ? undefined : n;
      };

      const updateFields = {
        title: projectTitle,
        description: projectDescription,
        demoVideoUrl: projectDemoVideoUrl,
        specifications: safelyParseArrayField(req.body.projectSpecifications),
        size: coerceNumber(projectSize) ?? projectSize, // garder la valeur brute si non numérique
        order: coerceNumber(projectOrder) ?? projectOrder,
        objectives: safelyParseArrayField(req.body.projectObjectives),
        exerciseStatements: safelyParseArrayField(
          req.body.projectExerciseStatements
        ),
        resourceLinks: safelyParseArrayField(req.body.projectResourceLinks),
        module: projectModule, // Met à jour le module.
      };

      // Logique pour la suppression de l'ancien fichier Markdown si un nouveau est téléchargé.
      if (markdownFile) {
        if (existingProject.markdownFilePath) {
          const oldMarkdownPath = path.join(
            __dirname,
            "../public",
            existingProject.markdownFilePath
          );
          if (fs.existsSync(oldMarkdownPath)) {
            fs.unlinkSync(oldMarkdownPath);
            console.log(
              `Ancien fichier Markdown supprimé : ${oldMarkdownPath}`
            );
          }
        }
        updateFields.markdownFilePath = `/uploads/project_markdowns/${markdownFile.filename}`;
      }
      // Logique pour la suppression du fichier Markdown si `clearMarkdown` est vrai et qu'aucun nouveau fichier n'est uploadé.
      else if (clearMarkdown === "true") {
        // `clearMarkdown` est une chaîne 'true' si envoyé par FormData.
        if (existingProject.markdownFilePath) {
          const oldMarkdownPath = path.join(
            __dirname,
            "../public",
            existingProject.markdownFilePath
          );
          if (fs.existsSync(oldMarkdownPath)) {
            fs.unlinkSync(oldMarkdownPath);
            console.log(
              `Fichier Markdown existant supprimé suite à clearMarkdown : ${oldMarkdownPath}`
            );
          }
        }
        updateFields.markdownFilePath = undefined; // Efface le chemin du fichier dans la base de données.
      }

      const project = await Project.findByIdAndUpdate(
        projectId,
        {
          $set: updateFields, // Utilise $set pour remplacer les tableaux correctement.
        },
        { new: true, runValidators: true }
      );

      if (!project) {
        return res.status(404).json({ error: "Projet maître non trouvé." });
      }
      return res
        .status(200)
        .json({ message: "Projet maître mis à jour avec succès.", project });
    }
  } catch (e) {
    console.error("Error updating project:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `getProjects` récupère une liste de projets templates (pour le staff/admin).
 * @param {object} req - L'objet requête Express.
 * @param {object} res - L'objet réponse Express.
 */
export async function getProjects(req, res) {
  try {
    const projects = await Project.find({ status: "template" });
    res.status(200).json(projects);
  } catch (e) {
    console.error("Error fetching projects:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `getStudentProjects` récupère les projets assignés à l'étudiant connecté.
 * Elle formate les données pour inclure les détails du projet et de l'assignation.
 * @param {object} req - L'objet requête Express (contient les infos de l'utilisateur).
 * @param {object} res - L'objet réponse Express.
 */
export async function getStudentProjects(req, res) {
  try {
    const studentId = req.user._id;

    const query = {
      "assignments.student": studentId,
    };

    const projects = await Project.find(query).populate({
      path: "assignments.student",
      select: "name",
    });
    console.log(`Found ${projects.length} projects for student ${studentId}.`);

    const studentProjects = projects
      .map((project) => {
        if (!project) {
          console.warn(
            "Encountered null or undefined project in map. Skipping."
          );
          return null;
        }
        const studentAssignment = project.assignments.find(
          (assignment) =>
            assignment.student && assignment.student._id.equals(studentId)
        );
        if (studentAssignment) {
          console.log(
            `Found assignment for project ${project.title}: ${studentAssignment._id}`
          );
          return {
            _id: studentAssignment._id, // L'ID de l'assignation devient l'ID principal pour le frontend.
            projectId: project._id, // Ajout de l'ID du projet maître.
            title: project.title,
            description: project.description,
            objectives: project.objectives,
            specifications: project.specifications,
            exerciseStatements: project.exerciseStatements,
            resourceLinks: project.resourceLinks,
            demoVideoUrl: project.demoVideoUrl,
            status: project.status, // Statut du projet maître.
            module: project.module, // Inclure le module du projet maître.
            assignmentId: studentAssignment._id,
            assignmentStatus: studentAssignment.status,
            repoUrl: studentAssignment.repoUrl,
            submissionDate: studentAssignment.submissionDate,
            evaluations: studentAssignment.evaluations,
            peerEvaluators: studentAssignment.peerEvaluators,
            staffValidator: studentAssignment.staffValidator,
            markdownFilePath: project.markdownFilePath, // Chemin du fichier Markdown.
          };
        }
        return null;
      })
      .filter((p) => p !== null);

    res.status(200).json(studentProjects);
  } catch (e) {
    console.error("Error fetching student projects:", e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `assignProjectToStudent` gère l'assignation manuelle d'un projet template à un étudiant par un administrateur.
 * @param {object} req - L'objet requête Express (contient les IDs de l'étudiant et du projet).
 * @param {object} res - L'objet réponse Express.
 */
export async function assignProjectToStudent(req, res) {
  try {
    // Seuls les administrateurs peuvent assigner manuellement un projet.
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Non autorisé à assigner manuellement un projet." });
    }

    const { studentId, projectId } = req.body; // Récupère l'ID de l'étudiant et du projet.

    const student = await User.findById(studentId);
    if (!student || student.role !== "apprenant") {
      return res
        .status(404)
        .json({ error: "Apprenant non trouvé ou n'est pas un apprenant." });
    }

    const project = await Project.findById(projectId); // Trouve le projet template par son ID.
    if (!project || project.status !== "template") {
      return res
        .status(404)
        .json({ error: "Projet non trouvé ou non un template." });
    }

    // Vérifie si l'étudiant est déjà assigné à ce projet.
    const existingAssignment = project.assignments.some((assign) =>
      assign.student.equals(studentId)
    );
    if (existingAssignment) {
      return res.status(400).json({
        error: `L'apprenant est déjà assigné au projet ${project.title}.`,
      });
    }

    // Ajoute une nouvelle assignation au projet.
    project.assignments.push({
      student: studentId,
      status: "assigned",
      repoUrl: "",
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await project.save(); // Sauvegarde le projet avec la nouvelle assignation.

    // Ajoute le projet à la liste des projets de l'étudiant si ce n'est pas déjà fait.
    if (!student.projects.includes(project._id)) {
      student.projects.push(project._id);
      await student.save(); // Sauvegarde l'étudiant avec la nouvelle référence de projet.
    }

    res.status(201).json({
      message: `Projet '${project.title}' assigné avec succès à ${student.name}.`,
      project,
    });
  } catch (e) {
    console.error("Error assigning project:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `submitProjectSolution` gère la soumission d'une solution de projet par un apprenant.
 * Valide l'URL du dépôt GitHub, les créneaux d'évaluation et enregistre la soumission.
 * @param {object} req - L'objet requête Express (contient l'ID du projet, l'assignation, l'URL du dépôt et les créneaux sélectionnés).
 * @param {object} res - L'objet réponse Express.
 */
export async function submitProjectSolution(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître.
    const { assignmentId, repoUrl, githubPagesUrl } = req.body; // ID de l'assignation, URL du dépôt, URL GitHub Pages.
    const studentId = req.user._id; // ID de l'apprenant connecté.

    // Vérifier que l'apprenant a au moins 2 points d'évaluation avant de soumettre.
    const student = await User.findById(studentId).select(
      "evaluationPoints role"
    );
    if (!student) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    // Les membres du staff/admin/évaluateurs peuvent soumettre sans points
    if (student.role === "apprenant" && (student.evaluationPoints || 0) < 1) {
      return res.status(400).json({
        error:
          "Vous devez avoir au moins 1 point d'évaluation pour soumettre un projet.",
      });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: "ID d'assignation manquant." });
    }

    const project = await Project.findOne({
      _id: projectId,
      "assignments._id": assignmentId,
      "assignments.student": studentId,
    });

    if (!project) {
      return res.status(404).json({
        error: "Projet ou assignation non trouvé(e) pour cet étudiant.",
      });
    }

    const assignment = project.assignments.id(assignmentId);

    if (assignment.status !== "assigned") {
      return res.status(400).json({
        error:
          "Cette assignation n'est pas en statut 'assigned' et ne peut être soumise.",
      });
    }

    if (!repoUrl || !validateGithubUrl(repoUrl)) {
      return res.status(400).json({ error: "URL GitHub invalide." });
    }

    // Nouvelle validation conditionnelle pour GitHub Pages URL
    const requiresGithubPages = ["HTML / CSS", "Framework"].includes(
      project.module
    );
    if (
      requiresGithubPages &&
      (!githubPagesUrl || !validateGithubPagesUrl(githubPagesUrl))
    ) {
      return res.status(400).json({
        error: "URL GitHub Pages invalide ou manquante pour ce type de projet.",
      });
    }

    // --- Nouvelle logique de sélection automatique des créneaux ---
    const now = new Date();
    // Les créneaux doivent être au moins 1 heure après l'heure de soumission
    const minStartTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);

    const availableSlots = await AvailabilitySlot.find({
      isBooked: false,
      startTime: { $gt: minStartTime }, // Créneaux futurs et au moins 1h après la soumission
      evaluator: { $ne: studentId }, // L'étudiant ne peut pas s'évaluer lui-même
    }).populate("evaluator", "name role");

    // Filtrer les créneaux pour s'assurer que l'évaluateur a un rôle valide (maintenant inclut 'apprenant')
    const validSlots = availableSlots.filter((slot) =>
      ["evaluator", "staff", "admin", "apprenant"].includes(slot.evaluator.role)
    );

    if (validSlots.length < 2) {
      return res.status(400).json({
        error:
          "Pas assez de créneaux disponibles avec des évaluateurs valides pour la double évaluation slot valide.",
    });
    }

    let selectedSlots = [];
    let uniqueEvaluators = new Set();
    const minTimeDifferenceMs = 1 * 60 * 60 * 1000; // 1 heure en millisecondes

    // Tenter de trouver deux créneaux respectant toutes les contraintes
    // On mélange les créneaux pour une sélection "aléatoire"
    const shuffledSlots = validSlots.sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffledSlots.length; i++) {
      const slot1 = shuffledSlots[i];
      if (uniqueEvaluators.has(slot1.evaluator._id.toString())) {
        continue; // Déjà un créneau de cet évaluateur
      }

      for (let j = i + 1; j < shuffledSlots.length; j++) {
        const slot2 = shuffledSlots[j];

        // Vérifier évaluateurs différents
        if (slot1.evaluator._id.equals(slot2.evaluator._id)) {
          continue;
        }

        // Vérifier le décalage horaire entre les deux créneaux
        const timeDiff = Math.abs(
          slot1.startTime.getTime() - slot2.startTime.getTime()
        );
        if (timeDiff < minTimeDifferenceMs) {
          continue;
        }

        selectedSlots.push(slot1, slot2);
        uniqueEvaluators.add(slot1.evaluator._id.toString());
        uniqueEvaluators.add(slot2.evaluator._id.toString());
        break; // On a trouvé nos deux créneaux
      }
      if (selectedSlots.length === 2) break;
    }

    if (selectedSlots.length !== 2) {
      return res.status(400).json({
        error:
          "Impossible de trouver deux créneaux d'évaluation distincts avec des évaluateurs différents et un décalage de 2 heures.",
      });
    }
    // --- Fin de la nouvelle logique ---

    assignment.repoUrl = repoUrl;
    assignment.submissionDate = new Date();
    assignment.status = "submitted";
    if (githubPagesUrl) {
      assignment.githubPagesUrl = githubPagesUrl;
    }

    for (const slot of selectedSlots) {
      // Marquer le créneau comme réservé
      slot.isBooked = true;
      slot.bookedByStudent = studentId;
      slot.bookedForProject = projectId;
      await slot.save();

      const evaluation = await Evaluation.create({
        project: projectId,
        assignment: assignmentId,
        evaluator: slot.evaluator._id, // Assurez-vous d'utiliser l'ID de l'évaluateur
        student: studentId,
        status: "pending",
        slot: slot._id, // Référence au créneau d'évaluation.
      });
      assignment.evaluations.push(evaluation._id);
    }

    await project.save();

    // Décrémenter les points d'évaluation de l'étudiant en fonction du nombre de slots réservés.
    // Cette partie est pour l'apprenant, pas pour les staff/admin/evaluators
    if (student.role === "apprenant") {
      const decrement = 1; // Pour la soumission d'un projet, on décrémente de 1 point
      if (decrement > 0) {
        student.evaluationPoints = Math.max(
          0,
          (student.evaluationPoints || 0) - decrement
        );
        await student.save();
      }
    }

    // Logger la soumission de projet pour l'historique d'activité.
    await ActivityLogger.logProjectSubmitted(
      studentId,
      projectId,
      assignmentId,
      repoUrl,
      req
    );

    res.status(200).json({
      message:
        "Solution soumise avec succès avec des créneaux automatiquement assignés.",
      project,
    });
  } catch (e) {
    console.error("Error submitting project solution:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `finalReviewProject` gère l'approbation ou le rejet final d'une soumission de projet par le staff/admin.
 * Met à jour le statut de l'assignation, attribue le projet suivant si approuvé, et gère les notifications.
 * @param {object} req - L'objet requête Express (contient l'ID du projet, l'assignation et le statut de révision).
 * @param {object} res - L'objet réponse Express.
 */
export async function finalReviewProject(req, res) {
  // Renommé de approveProject
  try {
    console.log("Début de finalReviewProject.");
    const { id: projectId } = req.params; // ID du projet maître.
    const { assignmentId, status } = req.body; // ID de l'assignation et le nouveau statut (approved/rejected).

    console.log(`projectId: ${projectId}, assignmentId: ${assignmentId}, status: ${status}`);

    if (!assignmentId || !status) {
      console.log("Erreur 400: ID d\'assignation ou statut manquant.");
      return res
        .status(400)
        .json({ error: "ID d'assignation ou statut manquant." });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin.
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      console.log(`Erreur 403: Rôle non autorisé: ${req.user.role}`);
      return res.status(403).json({
        error: "Non autorisé à évaluer des projets.",
      });
    }
    console.log(`Utilisateur ${req.user.name} (${req.user.role}) autorisé.`);

    const project = await Project.findById(projectId);
    if (!project) {
      console.log(`Erreur 404: Projet maître non trouvé pour l'ID: ${projectId}`);
      return res.status(404).json({ error: "Projet maître non trouvé." });
    }
    console.log(`Projet trouvé: ${project.title}`);

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      console.log(`Erreur 404: Assignation non trouvée pour l'ID: ${assignmentId} dans le projet ${projectId}`);
      return res
        .status(404)
        .json({ error: "Assignation non trouvée dans ce projet." });
    }
    console.log(`Assignation trouvée. Statut actuel: ${assignment.status}`);

    if (!["approved", "rejected"].includes(status)) {
      console.log(`Erreur 400: Statut d'évaluation invalide: ${status}`);
      return res.status(400).json({ error: "Statut d'évaluation invalide." });
    }

    let message = "";
    let notificationMessage = "";

    if (status === "approved") {
      console.log("Traitement du statut: approved.");
      if (assignment.status === "approved") {
        console.log("Projet déjà approuvé, renvoi de la réponse.");
        return res.json({ message: "Projet déjà approuvé.", project });
      }
      assignment.status = "approved";
      console.log(`Statut de l'assignation mis à jour à: ${assignment.status}`);
      // assignment.staffValidator = req.user._id; // Optionnel: enregistrer le validateur staff.
      message = "Projet approuvé avec succès et projet suivant assigné.";
      notificationMessage = `Votre projet \'${project.title}\' a été approuvé par le personnel. Félicitations ! Un nouveau projet vous a été assigné.`;

      const student = await User.findById(assignment.student);
      if (student) {
        console.log(`Apprenant trouvé: ${student.name}. totalProjectsCompleted avant: ${student.totalProjectsCompleted}`);
        // student.daysRemaining += DAY_BONUS[project.size] || 1; // Ajoute des jours restants à l'étudiant en fonction de la taille du projet.
        student.totalProjectsCompleted = (student.totalProjectsCompleted || 0) + 1; // Incrémente le nombre total de projets complétés.
        console.log(`totalProjectsCompleted après: ${student.totalProjectsCompleted}`);

        // Obtenez le module du projet approuvé
        const projectModule = project.module;

        // Suppression de la logique de mise à jour de la progression dans le module actuel
        // if (student.currentModule === projectModule) {
        //   student.currentModuleProjectsCompleted = (student.currentModuleProjectsCompleted || 0) + 1;
        //   console.log(`Projets complétés dans le module actuel (${student.currentModule}) : ${student.currentModuleProjectsCompleted}`);
        // }

        // Compter les projets template pour ce module
        const totalProjectsInModule = await Project.countDocuments({
          module: projectModule,
          status: "template",
        });
        console.log(`Total projets template dans le module ${projectModule}: ${totalProjectsInModule}`);

        // Compter les projets approuvés par cet étudiant pour ce module
        const completedProjectsInModule = await Project.countDocuments({
          module: projectModule,
          "assignments.student": student._id,
          "assignments.status": "approved",
        });
        console.log(`Projets complétés par l'étudiant dans le module ${projectModule}: ${completedProjectsInModule}`);

        // Logique pour attribuer des badges de module (si un modèle Badge est implémenté et décommenté).
        const badgeNameForModule = moduleToBadgeNameMap[projectModule];

        if (badgeNameForModule) {
          console.log(`Recherche de badge pour le module: ${projectModule}`);
          // Si tous les projets du module sont complétés par l'étudiant
          if (completedProjectsInModule >= totalProjectsInModule) {
            console.log("Tous les projets du module sont complétés. Vérification des badges.");
            const moduleBadge = await Badge.findOne({ name: badgeNameForModule });

            if (moduleBadge && !student.badges.includes(moduleBadge._id)) {
              console.log(`Attribution du badge: ${moduleBadge.name}`);
              student.badges.push(moduleBadge._id);
              await Notification.create({
                user: student._id,
                type: "badge_earned",
                message: `Félicitations ! Vous avez gagné le badge \'${moduleBadge.name}\' pour avoir terminé le module ${projectModule} !`,
              });
              console.log(`Badge \'${moduleBadge.name}\' attribué à ${student.name}.`);
            }
          }
        }

        // Incrémentation du niveau si tous les projets du module sont complétés ou si le module correspond au niveau actuel
        const moduleLevel = Object.keys(levelToModuleMap).find(key => levelToModuleMap[key] === projectModule);
        if (moduleLevel && completedProjectsInModule >= totalProjectsInModule) {
          // Incrémenter le niveau uniquement si l'apprenant n'a pas déjà dépassé ce niveau via d'autres modules
          if (student.level < parseInt(moduleLevel) + 1) {
            console.log(`Niveau actuel de l'étudiant: ${student.level}, Niveau du module: ${moduleLevel}. Incrémentation du niveau.`);
            student.level = parseInt(moduleLevel) + 1; // Incrémenter au niveau suivant du module
            await Notification.create({
              user: student._id,
              type: "level_up",
              message: `Félicitations ! Vous avez atteint le niveau ${student.level} en terminant tous les projets du module ${projectModule} !`,
            });
            console.log(`L'apprenant ${student.name} est passé au niveau ${student.level}.`);
          }

          // Suppression de la logique de mise à jour du module actuel de l'étudiant et de la réinitialisation de la progression du module
          // Cette logique est maintenant gérée dans assignNextProject

        }
        // Assignation du prochain projet en fonction du nouveau niveau de l'étudiant.
        console.log(`Assignation du prochain projet pour l'étudiant ${student.name} au niveau ${student.level}.`);
        await assignNextProject(student._id, project);

        console.log("Sauvegarde de l'objet étudiant.");
        await student.save();
      }
    } else if (status === "rejected") {
      console.log("Traitement du statut: rejected.");
      if (assignment.status === "rejected") {
        console.log("Projet déjà rejeté, renvoi de la réponse.");
        return res.json({ message: "Projet déjà rejeté.", project });
      }
      assignment.status = "assigned"; // Rejette le projet et le remet à 'assigned' pour resoumission.
      assignment.repoUrl = undefined; // Efface l'URL du dépôt.
      assignment.submissionDate = undefined; // Efface la date de soumission.
      console.log(`Statut de l'assignation mis à jour à: ${assignment.status}`);
      // TODO: Optionnel: effacer les évaluations existantes liées à cette assignation pour forcer de nouvelles évaluations.
      message = "Projet rejeté avec succès et remis en attente de resoumission.";
      notificationMessage = `Votre projet \'${project.title}\' a été rejeté par le personnel. Veuillez revoir votre projet et le soumettre à nouveau.`;
    }

    console.log("Sauvegarde de l'objet projet.");
    await project.save(); // Sauvegarde le projet maître pour persister les changements de l'assignation.

    // Notifier l'étudiant du résultat de l'évaluation finale.
    const student = await User.findById(assignment.student); // Récupère l'étudiant pour la notification.
    if (student) {
      console.log(`Envoi de notification à l'étudiant ${student.name}.`);
      await Notification.create({
        user: student._id,
        type: "project_status_update",
        message: notificationMessage,
      });

      // Si le projet est approuvé, notifier également le staff/admin du passage au projet suivant.
      if (status === "approved") {
        console.log("Envoi de notification aux staff/admin pour progression de l'étudiant.");
        const staffAdminUsers = await User.find({
          role: { $in: ["staff", "admin"] },
        });
        for (const staffAdmin of staffAdminUsers) {
          await Notification.create({
            user: staffAdmin._id,
            type: "student_project_progression",
            message: `L'apprenant ${student.name} a complété le projet \'${project.title}\' et est passé au projet suivant.`,
          });
        }
      }
    }

    console.log("Fin de finalReviewProject. Envoi de la réponse finale.");
    res.json({ message: message, project });
  } catch (e) {
    console.error("Error during final staff review:", e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `getProjectsAwaitingStaffReview` récupère la liste des projets qui sont en attente de révision par le staff/admin.
 * @param {object} req - L'objet requête Express (contient les infos de l'utilisateur).
 * @param {object} res - L'objet réponse Express.
 */
export async function getProjectsAwaitingStaffReview(req, res) {
  try {
    // Vérifier que l'utilisateur est un membre du personnel/admin.
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Non autorisé à consulter cette ressource.",
      });
    }

    // Trouver les projets maîtres où au moins une assignation est en attente de révision du personnel.
    const projects = await Project.find({
      "assignments.status": "awaiting_staff_review",
    }).populate({
      path: "assignments.student",
      select: "name email",
    });

    // Formater les résultats pour ne retourner que les assignations pertinentes.
    const formattedProjects = projects.flatMap((project) => {
      return project.assignments
        .filter((assignment) => assignment.status === "awaiting_staff_review")
        .map((assignment) => ({
          _id: project._id, // ID du projet maître.
          projectId: project._id,
          title: project.title,
          description: project.description,
          assignmentId: assignment._id,
          assignmentStatus: assignment.status,
          repoUrl: assignment.repoUrl,
          submissionDate: assignment.submissionDate,
          student: assignment.student, // L'objet étudiant peuplé.
        }));
    });

    res.status(200).json(formattedProjects);
  } catch (e) {
    console.error("Error fetching projects awaiting staff review:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `getAllProjects` récupère tous les projets maîtres avec leurs assignations et les étudiants associés.
 * Réservé au staff/admin.
 * @param {object} req - L'objet requête Express (contient les infos de l'utilisateur).
 * @param {object} res - L'objet réponse Express.
 */
export async function getAllProjects(req, res) {
  try {
    // Vérifier que l'utilisateur est un membre du personnel/admin.
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Non autorisé à consulter cette ressource.",
      });
    }

    // Récupérer tous les projets, en peuplant les étudiants associés aux assignations.
    const projects = await Project.find({})
      .populate({
        path: "assignments.student",
        select: "name email",
      })
      .lean(); // Ajouter .lean() pour de meilleures performances si seule la lecture est nécessaire.

    res.status(200).json(projects);
  } catch (e) {
    console.error("Error fetching all projects:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `getCancelledProjects` récupère une liste de projets qui ont été annulés et nécessitent potentiellement une réassignation.
 * Réservé au staff/admin.
 * @param {object} req - L'objet requête Express (contient les infos de l'utilisateur).
 * @param {object} res - L'objet réponse Express.
 */
export async function getCancelledProjects(req, res) {
  try {
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res.status(403).json({
        error: "Non autorisé à consulter cette ressource.",
      });
    }

    const projects = await Project.find({
      "assignments.status": "cancelled",
    })
      .populate({
        path: "assignments.student",
        select: "name email",
      })
      .populate({
        path: "assignments.evaluations",
        populate: {
          path: "slot evaluator",
          select: "startTime endTime name email",
        },
      });

    const formattedProjects = projects.flatMap((project) => {
      return project.assignments
        .filter((assignment) => {
          // Un projet est annulé et a besoin de réassignation si:
          // 1. Son statut d'assignation est "cancelled"
          // 2. Il n'a AUCUNE évaluation en cours (pending) associée à cette assignation.
          const hasPendingEvaluation = assignment.evaluations.some(
            (evalItem) => evalItem.status === "pending"
          );
          return assignment.status === "cancelled" && !hasPendingEvaluation;
        })
        .map((assignment) => ({
          _id: project._id, // ID du projet maître.
          title: project.title,
          description: project.description,
          studentName: assignment.student?.name || "N/A",
          assignmentId: assignment._id,
          assignmentStatus: assignment.status,
          // Vous pouvez ajouter d'autres champs si nécessaire ici.
        }));
    });

    res.status(200).json(formattedProjects);
  } catch (e) {
    console.error("Error fetching cancelled projects:", e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `getProjectMarkdownContent` sert le contenu d'un fichier Markdown associé à un projet.
 * Lit le fichier Markdown depuis le système de fichiers et l'envoie en tant que texte brut.
 * @param {object} req - L'objet requête Express (contient l'ID du projet).
 * @param {object} res - L'objet réponse Express.
 */
export async function getProjectMarkdownContent(req, res) {
  try {
    const { id: projectId } = req.params; // Récupère l'ID du projet depuis les paramètres de l'URL.
    const project = await Project.findById(projectId); // Trouve le projet par son ID.

    if (!project || !project.markdownFilePath) {
      return res
        .status(404)
        .json({ error: "Fichier Markdown non trouvé pour ce projet." });
    }

    // Construit le chemin absolu du fichier Markdown sur le système de fichiers.
    const filePath = path.join(
      __dirname,
      "../public",
      project.markdownFilePath
    );

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: "Fichier Markdown non trouvé sur le serveur." });
    }

    const markdownContent = fs.readFileSync(filePath, "utf8"); // Lit le contenu du fichier.
    res.status(200).send(markdownContent); // Envoie le contenu en tant que réponse texte.
  } catch (e) {
    console.error("Error fetching project markdown content:", e);
    res.status(500).json({ error: e.message });
  }
}
