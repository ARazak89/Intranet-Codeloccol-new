import Project from '../models/Project.js';
import AvailabilitySlot from '../models/AvailabilitySlot.js';
import User from '../models/User.js';
import Evaluation from '../models/Evaluation.js';
import ActivityLogger from '../utils/activityLogger.js';
import uploadMarkdown from '../middlewares/markdownUploadMiddleware.js'; // Import du nouveau middleware
import fs from 'fs'; // Nécessaire pour lire les fichiers Markdown
import path from 'path'; // Nécessaire pour gérer les chemins de fichiers
import { fileURLToPath } from "url";
// import Assignment from '../models/Assignment.js'; // Supprimer cette ligne car Assignment.js n'existe pas

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mappage des niveaux aux modules correspondants. Utilisé pour l'assignation automatique de projets.
const levelToModuleMap = {
  1: 'CLI/Git & GIt Hub',
  2: 'HTML / CSS',
  3: 'Framework',
  4: 'WordPress',
  5: 'JavaScript',
  6: 'Node Js (API)',
  7: 'React JS',
  8: 'Electron JS',
  9: 'Mobile',
  10: 'Full Stack',
  11: 'Soft Skills',
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
 * Valide et réserve des créneaux d'évaluation pour une soumission de projet.
 * Assure qu'au moins 2 évaluateurs différents sont sélectionnés et que les créneaux sont disponibles.
 * @param {Array<string>} selectedSlotIds - Les IDs des créneaux sélectionnés.
 * @param {string} studentId - L'ID de l'étudiant soumettant le projet.
 * @param {string} projectId - L'ID du projet maître.
 * @param {string} assignmentId - L'ID de l'assignation du projet.
 * @returns {Promise<object>} Un objet contenant les créneaux réservés ou une erreur.
 */
async function _validateAndBookSlots(selectedSlotIds, studentId, projectId, assignmentId) {
  if (!selectedSlotIds || selectedSlotIds.length === 0) {
    return { error: 'Aucun créneau sélectionné.' };
  }

  const now = new Date();

  const slots = await AvailabilitySlot.find({
    _id: { $in: selectedSlotIds },
    isBooked: false,
    startTime: { $gt: now },
    evaluator: { $ne: studentId } // L'étudiant ne peut pas s'évaluer lui-même.
  }).populate('evaluator', 'name');

  if (slots.length !== selectedSlotIds.length) {
    return { error: 'Un ou plusieurs créneaux sélectionnés sont invalides ou déjà réservés.' };
  }

  const uniqueEvaluators = new Set(slots.map(slot => slot.evaluator._id.toString()));
  if (uniqueEvaluators.size < 2) {
    return { error: 'Au moins 2 évaluateurs différents sont nécessaires.' };
  }

  for (const slot of slots) {
    slot.isBooked = true;
    slot.bookedByStudent = studentId;
    slot.bookedForProject = projectId;
    await slot.save();
  }

  return { slots };
}

/**
 * `_assignProjectByLevel` est une fonction utilitaire interne qui assigne le prochain projet à un étudiant
 * en fonction de son niveau actuel. Elle s'assure que le projet n'est pas déjà assigné et met à jour les références.
 * @param {string} studentId - L'ID de l'étudiant à qui assigner le projet.
 * @param {number} level - Le niveau actuel de l'étudiant.
 * @returns {Promise<object>} Un objet avec un message de succès ou d'erreur, et potentiellement le projet assigné.
 */
async function _assignProjectByLevel(studentId, level) {
  try {
    const student = await User.findById(studentId);
    if (!student) {
      console.error(`Apprenant non trouvé pour l'ID: ${studentId}`);
      return { error: 'Apprenant non trouvé.' };
    }

    // 1) Essayer correspondance stricte: order + module
    let projectTemplate = await Project.findOne({
      status: 'template',
      order: level,
      module: levelToModuleMap[level],
    });

    // 2) Fallback: essayer par order seulement (ne pas bloquer si module ne matche pas)
    if (!projectTemplate) {
      projectTemplate = await Project.findOne({
        status: 'template',
        order: level,
      });
    }

    // 3) Fallback: prendre le plus petit order supérieur disponible
    if (!projectTemplate) {
      projectTemplate = await Project.findOne({
        status: 'template',
        order: { $gt: level },
      }).sort({ order: 1 });
    }

    if (!projectTemplate) {
      console.warn(`Aucun projet template disponible pour le niveau ${level} ni pour un ordre supérieur.`);
      return { error: `Aucun projet suivant disponible après le niveau ${level}.` };
    }

    // Vérifier si l'apprenant est déjà assigné à ce projet template.
    const existingAssignment = projectTemplate.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      console.log(`L'apprenant ${studentId} est déjà assigné au projet ${projectTemplate.title}.`);
      return { message: `L'apprenant est déjà assigné au projet ${projectTemplate.title}.` };
    }

    // Ajouter une nouvelle assignation au projet template.
    projectTemplate.assignments.push({
      student: studentId,
      status: 'assigned',
      repoUrl: '',
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await projectTemplate.save();

    // Ajouter le projet à la liste des projets de l'étudiant si ce n'est pas déjà fait.
    if (!student.projects.includes(projectTemplate._id)) {
      student.projects.push(projectTemplate._id);
      await student.save();
    }

    console.log(`Projet '${projectTemplate.title}' (ordre ${level}) assigné avec succès à l'apprenant ${student.name}.`);
    return { message: 'Projet assigné avec succès.', project: projectTemplate };
  } catch (e) {
    console.error(`Error assigning project by level to student ${studentId} for level ${level}:`, e);
    return { error: 'Erreur interne du serveur lors de l\'assignation du projet.' };
  }
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
    const { title, description, specifications, objectives, exerciseStatements, resourceLinks, demoVideoUrl, size, module } = req.body;

    // Calculer le prochain numéro d'ordre disponible pour le nouveau projet template.
    const latestProject = await Project.findOne({ status: 'template' }).sort({ order: -1 });
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
      status: 'template',
      order: newOrder, // Assigner l'ordre calculé.
      module, // Assigner le module.
      markdownFilePath: markdownFile ? `/uploads/project_markdowns/${markdownFile.filename}` : undefined, // Sauvegarder le chemin du fichier Markdown.
    });
    console.log("New project created:", newProject);

    res.status(201).json({ message: 'Projet template créé avec succès.', project: newProject });
  } catch (e) {
    console.error('Error creating project template:', e);
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
    const { assignmentId, projectTitle, projectDescription, projectDemoVideoUrl, projectSpecifications, projectSize, projectOrder, projectObjectives, projectExerciseStatements, projectResourceLinks, repoUrl, status, projectModule, clearMarkdown } = req.body; // Ajouter clearMarkdown ici

    if (assignmentId) {
      // Logique pour la mise à jour d'une assignation spécifique.
      const project = await Project.findOneAndUpdate(
        { _id: projectId, "assignments._id": assignmentId },
        {
          $set: {
            "assignments.$.repoUrl": repoUrl,
            "assignments.$.status": status,
          }
        },
        { new: true }
      );

      if (!project) {
        return res.status(404).json({ error: 'Projet maître ou assignation non trouvée.' });
      }
      return res.status(200).json({ message: 'Assignation de projet mise à jour avec succès.', project });

    } else {
      // Logique pour la mise à jour du projet maître.
      const existingProject = await Project.findById(projectId); // Récupère le projet existant une seule fois.
      if (!existingProject) {
        return res.status(404).json({ error: 'Projet maître non trouvé.' });
      }

      // Utilitaire local: rendre le parsing tolérant aux formats (Array direct, JSON string, CSV, simple string)
      const safelyParseArrayField = (raw) => {
        if (raw === undefined || raw === null) return [];
        if (Array.isArray(raw)) return raw.filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(v => String(v).trim());
        const text = String(raw).trim();
        if (text === '') return [];
        // Si la chaîne ressemble à du JSON, tenter de parser
        if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
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
        if (text.includes(',')) {
          return text.split(',').map(s => s.trim()).filter(s => s !== '');
        }
        // Sinon, considérer comme un seul élément
        return [text];
      };

      const coerceNumber = (val) => {
        if (val === undefined || val === null || val === '') return undefined;
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
        exerciseStatements: safelyParseArrayField(req.body.projectExerciseStatements),
        resourceLinks: safelyParseArrayField(req.body.projectResourceLinks),
        module: projectModule, // Met à jour le module.
      };

      // Logique pour la suppression de l'ancien fichier Markdown si un nouveau est téléchargé.
      if (markdownFile) {
        if (existingProject.markdownFilePath) {
          const oldMarkdownPath = path.join(__dirname, "../public", existingProject.markdownFilePath);
          if (fs.existsSync(oldMarkdownPath)) {
            fs.unlinkSync(oldMarkdownPath);
            console.log(`Ancien fichier Markdown supprimé : ${oldMarkdownPath}`);
          }
        }
        updateFields.markdownFilePath = `/uploads/project_markdowns/${markdownFile.filename}`;
      }
      // Logique pour la suppression du fichier Markdown si `clearMarkdown` est vrai et qu'aucun nouveau fichier n'est uploadé.
      else if (clearMarkdown === 'true') { // `clearMarkdown` est une chaîne 'true' si envoyé par FormData.
        if (existingProject.markdownFilePath) {
          const oldMarkdownPath = path.join(__dirname, "../public", existingProject.markdownFilePath);
          if (fs.existsSync(oldMarkdownPath)) {
            fs.unlinkSync(oldMarkdownPath);
            console.log(`Fichier Markdown existant supprimé suite à clearMarkdown : ${oldMarkdownPath}`);
          }
        }
        updateFields.markdownFilePath = undefined; // Efface le chemin du fichier dans la base de données.
      }

      const project = await Project.findByIdAndUpdate(
        projectId,
        {
          $set: updateFields // Utilise $set pour remplacer les tableaux correctement.
        },
        { new: true, runValidators: true }
      );

      if (!project) {
        return res.status(404).json({ error: 'Projet maître non trouvé.' });
      }
      return res.status(200).json({ message: 'Projet maître mis à jour avec succès.', project });
    }
  } catch (e) {
    console.error('Error updating project:', e);
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
    const projects = await Project.find({ status: 'template' });
    res.status(200).json(projects);
  } catch (e) {
    console.error('Error fetching projects:', e);
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
      path: 'assignments.student',
      select: 'name'
    });
  console.log(`Found ${projects.length} projects for student ${studentId}.`);

    const studentProjects = projects.map(project => {
      if (!project) {
        console.warn("Encountered null or undefined project in map. Skipping.");
        return null;
      }
      const studentAssignment = project.assignments.find(assignment => assignment.student && assignment.student._id.equals(studentId));
      if (studentAssignment) {
        console.log(`Found assignment for project ${project.title}: ${studentAssignment._id}`);
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
    }).filter(p => p !== null);

    res.status(200).json(studentProjects);
  } catch (e) {
    console.error('Error fetching student projects:', e.message, e.stack);
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à assigner manuellement un projet.' });
    }

    const { studentId, projectId } = req.body; // Récupère l'ID de l'étudiant et du projet.

    const student = await User.findById(studentId);
    if (!student || student.role !== 'apprenant') {
      return res.status(404).json({ error: 'Apprenant non trouvé ou n\'est pas un apprenant.' });
    }

    const project = await Project.findById(projectId); // Trouve le projet template par son ID.
    if (!project || project.status !== 'template') {
      return res.status(404).json({ error: 'Projet non trouvé ou non un template.' });
    }

    // Vérifie si l'étudiant est déjà assigné à ce projet.
    const existingAssignment = project.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      return res.status(400).json({ error: `L'apprenant est déjà assigné au projet ${project.title}.` });
    }

    // Ajoute une nouvelle assignation au projet.
    project.assignments.push({
      student: studentId,
      status: 'assigned',
      repoUrl: '',
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

    res.status(201).json({ message: `Projet '${project.title}' assigné avec succès à ${student.name}.`, project });
  } catch (e) {
    console.error('Error assigning project:', e);
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
    const { assignmentId, repoUrl, selectedSlotIds } = req.body; // ID de l'assignation, URL du dépôt, IDs des créneaux.
    const studentId = req.user._id; // ID de l'apprenant connecté.

    // Vérifier que l'apprenant a au moins 2 points d'évaluation avant de soumettre.
    try {
      const student = await User.findById(studentId).select('evaluationPoints');
      if (!student) {
        return res.status(404).json({ error: 'Utilisateur non trouvé.' });
      }
      if ((student.evaluationPoints || 0) < 2) {
        return res.status(400).json({ error: "Vous devez avoir au moins 2 points d'évaluation pour soumettre un projet." });
      }
    } catch (pointsErr) {
      console.error('Error checking evaluation points before submit:', pointsErr);
      return res.status(500).json({ error: 'Erreur lors de la vérification des points d\'évaluation.' });
    }

    if (!assignmentId) {
      return res.status(400).json({ error: 'ID d\'assignation manquant.' });
    }

    const project = await Project.findOne({
      _id: projectId,
      "assignments._id": assignmentId,
      "assignments.student": studentId,
    });

    if (!project) {
      return res
        .status(404)
        .json({ error: 'Projet ou assignation non trouvé(e) pour cet étudiant.' });
    }

    const assignment = project.assignments.id(assignmentId);

    if (assignment.status !== 'assigned') {
      return res.status(400).json({
        error:
          'Cette assignation n\'est pas en statut \'assigned\' et ne peut être soumise.',
      });
    }

    if (!repoUrl || !validateGithubUrl(repoUrl)) {
      return res.status(400).json({ error: 'URL GitHub invalide.' });
    }

    // Valider et réserver les créneaux d'évaluation sélectionnés.
    const slotsResult = await _validateAndBookSlots(
      selectedSlotIds,
      studentId,
      projectId,
      assignmentId,
    );

    if (slotsResult.error) {
      return res.status(400).json(slotsResult);
    }
    const slots = slotsResult.slots;

    assignment.repoUrl = repoUrl;
    assignment.submissionDate = new Date();
    assignment.status = 'submitted';

  for (const slot of slots) {
    const evaluation = await Evaluation.create({
      project: projectId,
        assignment: assignmentId,
        evaluator: slot.evaluator,
      student: studentId,
      status: 'pending',
        slot: slot._id, // Référence au créneau d'évaluation.
      });
      assignment.evaluations.push(evaluation._id);
    }

    await project.save();

    // Décrémenter les points d'évaluation de l'étudiant en fonction du nombre de slots réservés.
    try {
      const student = await User.findById(studentId);
      if (student) {
        const decrement = Array.isArray(slots) ? slots.length : 0;
        if (decrement > 0) {
          student.evaluationPoints = Math.max(0, Math.min(10, (student.evaluationPoints || 0) - decrement));
          await student.save();
        }
      }
    } catch (decrementErr) {
      console.error('Error decrementing evaluation points on project submit:', decrementErr);
    }

    // Logger la soumission de projet pour l'historique d'activité.
    await ActivityLogger.logProjectSubmitted(
      studentId,
      projectId,
      assignmentId,
      repoUrl,
      req
    );

    res.status(200).json({ message: 'Solution soumise avec succès.', project });
  } catch (e) {
    console.error('Error submitting project solution:', e);
    res.status(500).json({ error: e.message });
  }
}

/**
 * `finalReviewProject` gère l'approbation ou le rejet final d'une soumission de projet par le staff/admin.
 * Met à jour le statut de l'assignation, attribue le projet suivant si approuvé, et gère les notifications.
 * @param {object} req - L'objet requête Express (contient l'ID du projet, l'assignation et le statut de révision).
 * @param {object} res - L'objet réponse Express.
 */
export async function finalReviewProject(req, res) { // Renommé de approveProject
  try {
    const { id: projectId } = req.params; // ID du projet maître.
    const { assignmentId, status } = req.body; // ID de l'assignation et le nouveau statut (approved/rejected).

    if (!assignmentId || !status) {
      return res.status(400).json({ error: 'ID d\'assignation ou statut manquant.' });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin.
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à évaluer des projets.',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Projet maître non trouvé.' });

    const assignment = project.assignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignation non trouvée dans ce projet.' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Statut d\'évaluation invalide.' });
    }

    let message = '';
    let notificationMessage = '';

    if (status === 'approved') {
      if (assignment.status === 'approved') {
        return res.json({ message: 'Projet déjà approuvé.', project });
      }
      assignment.status = 'approved';
      // assignment.staffValidator = req.user._id; // Optionnel: enregistrer le validateur staff.
      message = 'Projet approuvé avec succès et projet suivant assigné.';
      notificationMessage = `Votre projet \'${project.title}\' a été approuvé par le personnel. Félicitations ! Un nouveau projet vous a été assigné.`;

      const student = await User.findById(assignment.student);
      if (student) {
        //DAY_BONUS[project.size] n'est pas défini, il faudrait le définir plus haut
        // student.daysRemaining += DAY_BONUS[project.size] || 1; // Ajoute des jours restants à l'étudiant en fonction de la taille du projet.
        student.level = Math.max(student.level, 1) + 1; // Incrémente le niveau de l'apprenant.
        // student.totalProjectsCompleted = (student.totalProjectsCompleted || 0) + 1; // Optionnel: suivre le nombre total de projets complétés.

        // TODO: Logique pour attribuer des badges (si un modèle Badge est implémenté et décommenté).

        // Assignation du prochain projet en fonction du nouveau niveau de l'étudiant.
        await _assignProjectByLevel(student._id, student.level);

        await student.save();
      }
    } else if (status === 'rejected') {
      if (assignment.status === 'rejected') {
        return res.json({ message: 'Projet déjà rejeté.', project });
      }
      assignment.status = 'assigned'; // Rejette le projet et le remet à 'assigned' pour resoumission.
      assignment.repoUrl = undefined; // Efface l'URL du dépôt.
      assignment.submissionDate = undefined; // Efface la date de soumission.
      // TODO: Optionnel: effacer les évaluations existantes liées à cette assignation pour forcer de nouvelles évaluations.
      notificationMessage = `Votre projet \'${project.title}\' a été rejeté par le personnel. Veuillez revoir votre projet et le soumettre à nouveau.`;
    }

    await project.save(); // Sauvegarde le projet maître pour persister les changements de l'assignation.

    // Notifier l'étudiant du résultat de l'évaluation finale.
    const student = await User.findById(assignment.student); // Récupère l'étudiant pour la notification.
      if (student) {
        // Notification.create() n'est pas défini, il faudrait l'importer
        // await Notification.create({
        //   user: student._id,
        // type: "project_status_update",
        // message: notificationMessage,
        // });
    }

    res.json({ message: message, project });
  } catch (e) {
    console.error('Error during final staff review:', e);
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
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    // Trouver les projets maîtres où au moins une assignation est en attente de révision du personnel.
    const projects = await Project.find({
      "assignments.status": "awaiting_staff_review",
    })
      .populate({
        path: 'assignments.student',
        select: 'name email',
    });

    // Formater les résultats pour ne retourner que les assignations pertinentes.
    const formattedProjects = projects.flatMap(project => {
      return project.assignments.filter(assignment => assignment.status === "awaiting_staff_review")
        .map(assignment => ({
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
    console.error('Error fetching projects awaiting staff review:', e);
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
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    // Récupérer tous les projets, en peuplant les étudiants associés aux assignations.
    const projects = await Project.find({})
      .populate({
        path: 'assignments.student',
        select: 'name email',
      }).lean(); // Ajouter .lean() pour de meilleures performances si seule la lecture est nécessaire.

    res.status(200).json(projects);
  } catch (e) {
    console.error('Error fetching all projects:', e);
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
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    const projects = await Project.find({
      "assignments.status": "cancelled",
    })
      .populate({
        path: 'assignments.student',
        select: 'name email',
      })
      .populate({
        path: 'assignments.evaluations',
        populate: {
          path: 'slot evaluator',
          select: 'startTime endTime name email',
        },
      });

    const formattedProjects = projects.flatMap(project => {
      return project.assignments.filter(assignment => {
        // Un projet est annulé et a besoin de réassignation si:
        // 1. Son statut d'assignation est "cancelled"
        // 2. Il n'a AUCUNE évaluation en cours (pending) associée à cette assignation.
        const hasPendingEvaluation = assignment.evaluations.some(evalItem => evalItem.status === "pending");
        return assignment.status === "cancelled" && !hasPendingEvaluation;
      })
        .map(assignment => ({
          _id: project._id, // ID du projet maître.
          title: project.title,
          description: project.description,
          studentName: assignment.student?.name || 'N/A',
          assignmentId: assignment._id,
          assignmentStatus: assignment.status,
          // Vous pouvez ajouter d'autres champs si nécessaire ici.
        }));
    });

    res.status(200).json(formattedProjects);
  } catch (e) {
    console.error('Error fetching cancelled projects:', e);
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
      return res.status(404).json({ error: 'Fichier Markdown non trouvé pour ce projet.' });
    }

    // Construit le chemin absolu du fichier Markdown sur le système de fichiers.
    const filePath = path.join(__dirname, "../public", project.markdownFilePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier Markdown non trouvé sur le serveur.' });
    }

    const markdownContent = fs.readFileSync(filePath, 'utf8'); // Lit le contenu du fichier.
    res.status(200).send(markdownContent); // Envoie le contenu en tant que réponse texte.

  } catch (e) {
    console.error('Error fetching project markdown content:', e);
    res.status(500).json({ error: e.message });
  }
}