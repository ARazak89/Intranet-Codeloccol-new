import Project from '../models/Project.js';
import AvailabilitySlot from '../models/AvailabilitySlot.js';
import User from '../models/User.js';
import Evaluation from '../models/Evaluation.js';
import ActivityLogger from '../utils/activityLogger.js';
// import Notification from '../models/Notification.js'; // Décommenter si vous avez un modèle Notification
// import Badge from '../models/Badge.js'; // Décommenter si vous avez un modèle Badge

const DAY_BONUS = { short: 1, medium: 2, long: 3 };

// Mappage des niveaux aux modules
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

// Fonctions utilitaires
function validateGithubUrl(url) {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+(\.git)?$/.test(url);
}

async function _validateAndBookSlots(selectedSlotIds, studentId, projectId, assignmentId) {
  if (!selectedSlotIds || selectedSlotIds.length === 0) {
    return { error: 'Aucun créneau sélectionné.' };
  }

  const now = new Date();

  const slots = await AvailabilitySlot.find({
    _id: { $in: selectedSlotIds },
    isBooked: false,
    startTime: { $gt: now },
    evaluator: { $ne: studentId } // L'étudiant ne peut pas s'évaluer lui-même
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

// Nouvelle fonction utilitaire pour assigner un projet en fonction du niveau de l'étudiant
async function _assignProjectByLevel(studentId, level) {
  try {
    const student = await User.findById(studentId);
    if (!student) {
      console.error(`Apprenant non trouvé pour l'ID: ${studentId}`);
      return { error: 'Apprenant non trouvé.' };
    }

    const projectTemplate = await Project.findOne({
      status: 'template',
      order: level,
      module: levelToModuleMap[level], // Filtrer par module correspondant au niveau
    });

    if (!projectTemplate) {
      console.warn(`Aucun projet template trouvé pour l'ordre: ${level}`);
      return { error: `Aucun projet template trouvé pour le niveau ${level}.` };
    }

    const existingAssignment = projectTemplate.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      console.log(`L'apprenant ${studentId} est déjà assigné au projet ${projectTemplate.title}.`);
      return { message: `L'apprenant est déjà assigné au projet ${projectTemplate.title}.` };
    }

    projectTemplate.assignments.push({
      student: studentId,
      status: 'assigned',
      repoUrl: '',
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await projectTemplate.save();

    if (!student.projects.includes(projectTemplate._id)) {
      student.projects.push(projectTemplate._id);
      await student.save();
    }

    // TODO: Notifier l'étudiant (si Notification modèle est décommenté)
    console.log(`Projet '${projectTemplate.title}' (ordre ${level}) assigné avec succès à l'apprenant ${student.name}.`);
    return { message: 'Projet assigné avec succès.', project: projectTemplate };
  } catch (e) {
    console.error(`Error assigning project by level to student ${studentId} for level ${level}:`, e);
    return { error: 'Erreur interne du serveur lors de l\'assignation du projet.' };
  }
}

// Fonctions de contrôleur de projet
export async function createProject(req, res) {
  try {
    const { title, description, specifications, objectives, exerciseStatements, resourceLinks, demoVideoUrl, size, module } = req.body;

    // Déterminer l'ordre du nouveau projet
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
      order: newOrder, // Assigner l'ordre calculé
      module, // Ajouter le module
    });
    console.log("New project created:", newProject);

    res.status(201).json({ message: 'Projet template créé avec succès.', project: newProject });
  } catch (e) {
    console.error('Error creating project template:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function updateProject(req, res) {
  try {
    const { id: projectId } = req.params;
    const { assignmentId, projectTitle, projectDescription, projectDemoVideoUrl, projectSpecifications, projectSize, projectOrder, projectObjectives, projectExerciseStatements, projectResourceLinks, repoUrl, status, projectModule } = req.body;

    if (assignmentId) {
      // Mise à jour d'une assignation spécifique
      const project = await Project.findOneAndUpdate(
        { _id: projectId, "assignments._id": assignmentId },
        {
          $set: {
            // Seuls repoUrl et status peuvent être mis à jour pour une assignation via cette route
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
      // Mise à jour du projet maître
      const updateFields = {
        title: projectTitle,
        description: projectDescription,
        demoVideoUrl: projectDemoVideoUrl,
        specifications: projectSpecifications,
        size: projectSize,
        order: projectOrder,
        objectives: projectObjectives,
        exerciseStatements: projectExerciseStatements,
        resourceLinks: projectResourceLinks,
        module: projectModule, // Ajouter le module pour la mise à jour du projet maître
      };

      const project = await Project.findByIdAndUpdate(
        projectId,
        {
          $set: updateFields // Utiliser $set pour remplacer les tableaux correctement
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

export async function getProjects(req, res) {
  try {
    const projects = await Project.find({ status: 'template' });
    res.status(200).json(projects);
  } catch (e) {
    console.error('Error fetching projects:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function getStudentProjects(req, res) {
  try {
  const studentId = req.user._id;

    // Retirer la logique de filtrage par niveau/module ici, le frontend gérera le regroupement et l'affichage.
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
          _id: studentAssignment._id, // L'ID de l'assignation devient l'ID principal
          projectId: project._id, // Ajout de l'ID du projet maître
          title: project.title,
          description: project.description,
          objectives: project.objectives,
          specifications: project.specifications,
          exerciseStatements: project.exerciseStatements,
          resourceLinks: project.resourceLinks,
          demoVideoUrl: project.demoVideoUrl,
          status: project.status, // Statut du projet maître
          module: project.module, // Inclure le module du projet maître
          assignmentId: studentAssignment._id,
          assignmentStatus: studentAssignment.status,
          repoUrl: studentAssignment.repoUrl,
          submissionDate: studentAssignment.submissionDate,
          evaluations: studentAssignment.evaluations,
          peerEvaluators: studentAssignment.peerEvaluators,
          staffValidator: studentAssignment.staffValidator,
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

export async function assignProjectToStudent(req, res) {
  try {
    // Seuls les administrateurs peuvent assigner manuellement un projet
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé à assigner manuellement un projet.' });
    }

    const { studentId, projectId } = req.body; // Récupérer également le projectId

    const student = await User.findById(studentId);
    if (!student || student.role !== 'apprenant') {
      return res.status(404).json({ error: 'Apprenant non trouvé ou n\'est pas un apprenant.' });
    }

    const project = await Project.findById(projectId); // Trouver le projet par son ID
    if (!project || project.status !== 'template') {
      return res.status(404).json({ error: 'Projet non trouvé ou non un template.' });
    }

    const existingAssignment = project.assignments.some(assign => assign.student.equals(studentId));
    if (existingAssignment) {
      return res.status(400).json({ error: `L'apprenant est déjà assigné au projet ${project.title}.` });
    }

    project.assignments.push({
      student: studentId,
      status: 'assigned',
      repoUrl: '',
      evaluations: [],
      peerEvaluators: [],
      staffValidator: null,
    });
    await project.save(); // Sauvegarder le projet avec la nouvelle assignation

    if (!student.projects.includes(project._id)) {
      student.projects.push(project._id);
      await student.save(); // Sauvegarder l'étudiant avec la nouvelle référence de projet
    }

    res.status(201).json({ message: `Projet '${project.title}' assigné avec succès à ${student.name}.`, project });
  } catch (e) {
    console.error('Error assigning project:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function submitProjectSolution(req, res) {
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, repoUrl, selectedSlotIds } = req.body; // Attendre l'ID de l'assignation et les slots
    const studentId = req.user._id; // ID de l'apprenant connecté

    // Vérifier que l'apprenant a au moins 2 points d'évaluation avant de soumettre
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
        slot: slot._id, // Ajout de la référence au slot
      });
      assignment.evaluations.push(evaluation._id);
    }

    await project.save();

    // Décrémenter les points d'évaluation en fonction du nombre de slots réservés dans cette soumission
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

    // Logger la soumission de projet
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

export async function finalReviewProject(req, res) { // Renommé de approveProject
  try {
    const { id: projectId } = req.params; // ID du projet maître
    const { assignmentId, status } = req.body; // ID de l'assignation et le nouveau statut

    if (!assignmentId || !status) {
      return res.status(400).json({ error: 'ID d\'assignation ou statut manquant.' });
    }

    // Vérifier que l'utilisateur est un membre du personnel/admin
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
      // assignment.staffValidator = req.user._id; // Décommenter si vous voulez enregistrer le validateur staff
      message = 'Projet approuvé avec succès et projet suivant assigné.';
      notificationMessage = `Votre projet \'${project.title}\' a été approuvé par le personnel. Félicitations ! Un nouveau projet vous a été assigné.`;

      const student = await User.findById(assignment.student);
      if (student) {
        student.daysRemaining += DAY_BONUS[project.size] || 1; // Utiliser la taille du projet maître
        student.level = Math.max(student.level, 1) + 1; // Incrémenter le niveau de l'apprenant
        // student.totalProjectsCompleted = (student.totalProjectsCompleted || 0) + 1; // Décommenter si vous suivez ce compteur

        // TODO: Logique pour attribuer des badges (si Badge modèle est décommenté)

        // Assignation du prochain projet en fonction du nouveau niveau de l'étudiant
        await _assignProjectByLevel(student._id, student.level);

        await student.save();
      }
    } else if (status === 'rejected') {
      if (assignment.status === 'rejected') {
        return res.json({ message: 'Projet déjà rejeté.', project });
      }
      assignment.status = 'assigned'; // Rejeter le projet et le remettre à 'assigned' pour resoumission
      assignment.repoUrl = undefined; // Effacer l'URL du dépôt
      assignment.submissionDate = undefined; // Effacer la date de soumission
      // TODO: Optionnel: effacer les évaluations existantes liées à cette assignation pour forcer de nouvelles évaluations
      // Notification à l'apprenant
      message = 'Projet rejeté avec succès et remis en statut assigné pour resoumission.';
      notificationMessage = `Votre projet \'${project.title}\' a été rejeté par le personnel. Veuillez revoir votre projet et le soumettre à nouveau.`;
    }

    await project.save(); // Sauvegarder le projet maître pour persister les changements de l'assignation

    // Notifier l'étudiant du résultat de l'évaluation finale
    const student = await User.findById(assignment.student); // Récupérer l'étudiant pour la notification
      if (student) {
        await Notification.create({
          user: student._id,
        type: "project_status_update",
        message: notificationMessage,
      });
    }

    res.json({ message: message, project });
  } catch (e) {
    console.error('Error during final staff review:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function getProjectsAwaitingStaffReview(req, res) {
  try {
    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    // Trouver les projets où au moins une assignation est en attente de révision du personnel
    const projects = await Project.find({
      "assignments.status": "awaiting_staff_review",
    })
      .populate({
        path: 'assignments.student',
        select: 'name email',
    });

    // Formater les résultats pour ne retourner que les assignations pertinentes
    const formattedProjects = projects.flatMap(project => {
      return project.assignments.filter(assignment => assignment.status === "awaiting_staff_review")
        .map(assignment => ({
          _id: project._id, // ID du projet maître
            projectId: project._id,
          title: project.title,
          description: project.description,
            assignmentId: assignment._id,
          assignmentStatus: assignment.status,
            repoUrl: assignment.repoUrl,
            submissionDate: assignment.submissionDate,
          student: assignment.student, // L'objet étudiant peuplé
        }));
    });

    res.status(200).json(formattedProjects);
  } catch (e) {
    console.error('Error fetching projects awaiting staff review:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function getAllProjects(req, res) {
  try {
    // Vérifier que l'utilisateur est un membre du personnel/admin
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    // Récupérer tous les projets, en peuplant les étudiants associés aux assignations
    const projects = await Project.find({})
      .populate({
        path: 'assignments.student',
        select: 'name email',
      }).lean(); // Ajouter .lean() ici pour de meilleures performances

    res.status(200).json(projects);
  } catch (e) {
    console.error('Error fetching all projects:', e);
    res.status(500).json({ error: e.message });
  }
}

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
        // 2. Il n'a AUCUNE évaluation en cours (pending) associée à cette assignation
        const hasPendingEvaluation = assignment.evaluations.some(evalItem => evalItem.status === "pending");
        return assignment.status === "cancelled" && !hasPendingEvaluation;
      })
        .map(assignment => ({
          _id: project._id, // ID du projet maître
          title: project.title,
          description: project.description,
          studentName: assignment.student?.name || 'N/A',
          assignmentId: assignment._id,
          assignmentStatus: assignment.status,
          // Vous pouvez ajouter d'autres champs si nécessaire
        }));
    });

    res.status(200).json(formattedProjects);
  } catch (e) {
    console.error('Error fetching cancelled projects:', e);
    res.status(500).json({ error: e.message });
  }
}