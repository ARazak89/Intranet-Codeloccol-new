import Evaluation from "../models/Evaluation.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import Notification from "../models/Notification.js";
import ActivityLogger from "../utils/activityLogger.js";

// Pour l'apprenant qui a soumis le projet: voir les évaluations en attente pour son projet
export async function getEvaluationsForMySubmittedProjects(req, res) {
  try {
    const studentId = req.user._id;

    const evaluations = await Evaluation.find({ student: studentId })
      .populate("project") // Populate the entire project to access its assignments
      .populate("evaluator", "name")
      .populate("slot") // Populate the slot
      .sort("-createdAt");

    const formattedEvaluations = evaluations.map(evalItem => {
      const project = evalItem.project;
      if (!project) {
        console.warn(`[getEvaluationsForMySubmittedProjects] Project not found for evaluation ${evalItem._id}. Skipping this evaluation.`);
        return null; // Retourner null pour que filter(Boolean) le supprime
      }

      const assignment = project.assignments.id(evalItem.assignment); // Find the specific assignment by its ID
      if (!assignment) {
        console.warn(`[getEvaluationsForMySubmittedProjects] Assignment ${evalItem.assignment} not found within project ${project._id} for evaluation ${evalItem._id}. Skipping this evaluation.`);
        return null; // Retourner null pour que filter(Boolean) le supprime
      }

      return {
        ...evalItem.toObject(),
        project: { // Only include necessary project master details
          _id: project._id,
          title: project.title,
          description: project.description,
          order: project.order,
          demoVideoUrl: project.demoVideoUrl,
          specifications: project.specifications,
          exerciseStatements: project.exerciseStatements,
          resourceLinks: project.resourceLinks,
          objectives: project.objectives,
          size: project.size,
        },
        assignment: { // Include specific assignment details
          _id: assignment._id,
          status: assignment.status,
          repoUrl: assignment.repoUrl,
          submissionDate: assignment.submissionDate,
          // Add other assignment fields as needed
        },
        slot: evalItem.slot ? { // Include slot details if it exists
          _id: evalItem.slot._id,
          startTime: evalItem.slot.startTime,
          endTime: evalItem.slot.endTime,
          // Add other slot fields as needed
        } : null, // Ensure slot is null if not present
      };
    }).filter(Boolean);

    res.status(200).json(formattedEvaluations);
  } catch (e) {
    console.error('Error fetching evaluations for submitted projects:', e);
    res.status(500).json({ error: e.message });
  }
}

// Pour l'apprenant (évaluateur): voir les projets qu'il doit évaluer
export async function getPendingEvaluationsAsEvaluator(req, res) {
  try {
    const evaluatorId = req.user._id;

    const evaluations = await Evaluation.find({
      evaluator: evaluatorId,
      status: "pending",
    })
      .populate({
        path: "project",
        populate: {
          path: "assignments.student", // Peupler l'étudiant dans l'assignation
          select: "name email",
        },
      })
      // .populate("student", "name") // Student will be populated via assignment
      .populate("slot") // Populate the slot
      .sort("slot.startTime");

    const formattedEvaluations = evaluations.map(evalItem => {
      const project = evalItem.project;
      if (!project) {
        console.warn(`[getPendingEvaluationsAsEvaluator] Project not found for evaluation ${evalItem._id}. Skipping this evaluation.`);
        return null; // Retourner null pour que filter(Boolean) le supprime
      }

      const assignment = project.assignments.id(evalItem.assignment); // Find the specific assignment by its ID
      if (!assignment) {
        console.warn(`[getPendingEvaluationsAsEvaluator] Assignment ${evalItem.assignment} not found within project ${project._id} for evaluation ${evalItem._id}. Skipping this evaluation.`);
        return null; // Retourner null pour que filter(Boolean) le supprime
      }

      return {
        ...evalItem.toObject(),
        project: {
          _id: project._id,
          title: project.title,
          description: project.description,
          order: project.order,
          demoVideoUrl: project.demoVideoUrl,
          specifications: project.specifications,
          exerciseStatements: project.exerciseStatements,
          resourceLinks: project.resourceLinks,
          objectives: project.objectives,
          size: project.size,
          repoUrl: assignment.repoUrl, // Ajouter le repoUrl directement au projet
        },
        student: assignment.student ? { _id: assignment.student._id, name: assignment.student.name, email: assignment.student.email } : null, // Peupler l'étudiant au niveau de l'évaluation
        slot: evalItem.slot ? {
          _id: evalItem.slot._id,
          startTime: evalItem.slot.startTime,
          endTime: evalItem.slot.endTime,
        } : null,
      };
    }).filter(Boolean);

    res.status(200).json(formattedEvaluations);
  } catch (e) {
    console.error('Error fetching pending evaluations for evaluator:', e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour le staff/admin : voir toutes les évaluations
export async function getAllEvaluationsForStaff(req, res) {
  try {
    // Seuls le staff et les administrateurs peuvent voir cette liste
    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Non autorisé à consulter cette ressource." });
    }

    const evaluations = await Evaluation.find({
      // Nous voulons toutes les évaluations, quel que soit leur statut.
      // Le filtrage des assignations sera géré dans le .map si nécessaire pour des vues spécifiques.
    })
      .populate({
        path: "project",
        populate: {
          path: "assignments.student",
          select: "name email",
        },
      })
      .populate("evaluator", "name email")
      .populate("slot", "startTime endTime bookedByStudent bookedForProject bookedForAssignment")
      .select("project assignment student evaluator slot status submissionDate createdAt") // Ajouter createdAt
      .sort("-createdAt"); // Trier par date de création la plus récente

    // Nous n'avons plus besoin de filtrer ici, car nous voulons toutes les évaluations.
    // Nous allons juste formater les données.
    const formattedEvaluations = evaluations.map(evalItem => {
      if (!evalItem.project) return null; // Ignorer les évaluations sans projet

      const project = evalItem.project;
      const assignment = project.assignments.id(evalItem.assignment);

      if (!assignment) return null; // Ignorer les évaluations sans assignation correspondante

      return {
        ...evalItem.toObject(),
        project: { // Détails du projet maître
          _id: project._id,
          title: project.title,
          description: project.description,
          order: project.order,
          // ... autres champs du projet maître en cas de besoin
        },
        assignment: { // Détails de l'assignation spécifique
          _id: assignment._id,
          status: assignment.status,
          repoUrl: assignment.repoUrl,
          submissionDate: assignment.submissionDate,
          student: assignment.student, // L'apprenant est déjà peuplé via project.assignments.student
          // ... autres champs d'assignation
        },
        studentName: assignment.student ? assignment.student.name : 'N/A', // Pour compatibilité frontend
        studentEmail: assignment.student ? assignment.student.email : 'N/A', // Ajouter l'email de l'étudiant
      };
    }).filter(Boolean); // Supprimer les entrées nulles si des projets ou assignations étaient manquants

    res.status(200).json(formattedEvaluations);
  } catch (e) {
    console.error('Error fetching all evaluations for staff:', e);
    res.status(500).json({ error: e.message });
  }
}

// Pour l'apprenant (évaluateur): soumettre une évaluation
export async function submitEvaluation(req, res) {
  try {
    const { evaluationId } = req.params;
    const { feedback, status } = req.body; // feedback est un objet, status est 'accepted' ou 'rejected'
    const evaluatorId = req.user._id;

    const evaluation = await Evaluation.findById(evaluationId)
      .populate({
        path: 'project',
        populate: {
          path: 'assignments.student',
          select: '_id' // Seul l'ID est nécessaire pour la comparaison
        }
      })
      .populate('slot'); // Populate the slot to access bookedByStudent

    if (!evaluation) {
      return res.status(404).json({ error: "Évaluation non trouvée." });
    }

    // Vérifier l'existence du projet maître et de l'assignation
    const project = evaluation.project;
    if (!project) {
      return res.status(404).json({ error: "Projet maître lié à l'évaluation non trouvé." });
    }
    const assignment = project.assignments.id(evaluation.assignment);
    if (!assignment) {
      return res.status(404).json({ error: "Assignation liée à l'évaluation non trouvée." });
    }

    // Vérification de la nouvelle règle : les feedbacks ne peuvent être faits que par les apprenants
    // ayant leur slot choisi par un apprenant qui a soumis son projet.
    if (!evaluation.slot || !evaluation.slot.bookedByStudent || !evaluation.slot.bookedForProject) {
      return res.status(403).json({ error: "L'évaluation doit être liée à un slot réservé par un apprenant pour un projet." });
    }

    const bookingStudentId = evaluation.slot.bookedByStudent;
    const bookedProject = await Project.findById(evaluation.slot.bookedForProject)
      .populate({
        path: 'assignments.student',
        select: '_id'
      });

    if (!bookedProject) {
      return res.status(404).json({ error: "Projet de réservation non trouvé." });
    }

    const hasSubmittedProject = bookedProject.assignments.some(
      assignment => assignment.student && assignment.student.equals(bookingStudentId) && assignment.status === 'submitted'
    );

    if (!hasSubmittedProject) {
      return res.status(403).json({ error: "L'évaluateur ne peut pas soumettre de feedback car l'apprenant qui a réservé le slot n'a pas soumis son projet." });
    }

    // Vérifier que l'évaluateur de l'évaluation correspond à l'évaluateur du slot
    if (!evaluation.evaluator.equals(evaluation.slot.evaluator)) {
      return res.status(403).json({ error: "L'utilisateur n'est pas l'évaluateur désigné pour ce slot." });
    }

    if (!evaluation.evaluator.equals(evaluatorId)) {
      return res
        .status(403)
        .json({ error: "Non autorisé à soumettre cette évaluation." });
    }

    if (evaluation.status !== "pending") {
      return res.status(400).json({
        error: "Cette évaluation a déjà été soumise ou n'est plus en attente.",
      });
    }

    // Valider le statut
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Statut d'évaluation invalide." });
    }

    // Valider que tous les champs de feedback sont renseignés si le statut est 'accepted'
    if (status === "accepted") {
      const feedbackKeys = [
        "assiduite",
        "comprehension",
        "specifications",
        "maitrise_concepts",
        "capacite_expliquer",
      ];
      const allFeedbackProvided = feedbackKeys.every(
        (key) => feedback[key] && feedback[key].trim() !== "",
      );
      if (!allFeedbackProvided) {
        return res.status(400).json({
          error:
            "Tous les champs de feedback sont obligatoires pour accepter le projet.",
        });
      }
    }

    // Mettre à jour l'évaluation
    evaluation.feedback = feedback;
    evaluation.status = status;
    evaluation.submissionDate = new Date();
    await evaluation.save();

    // Logger la soumission d'évaluation
    await ActivityLogger.logEvaluationSubmitted(
      evaluatorId,
      evaluation._id,
      evaluation.project._id,
      evaluation.assignment,
      evaluation.score,
      req
    );

    // Incrémenter les points d'évaluation de l'évaluateur après envoi de feedback (borné à 10)
    try {
      const evaluator = await User.findById(evaluatorId);
      if (evaluator) {
        evaluator.evaluationPoints = Math.min(10, (evaluator.evaluationPoints || 0) + 1);
        await evaluator.save();
      }
    } catch (incrementErr) {
      console.error('Error incrementing evaluation points on feedback submit:', incrementErr);
    }

    // Récupérer toutes les évaluations pour cette assignation spécifique
    const assignmentEvaluations = await Evaluation.find({
      assignment: assignment._id,
    });
    console.log(`[submitEvaluation] Found ${assignmentEvaluations.length} evaluations for assignment ${assignment._id}.`);
    console.log(`[submitEvaluation] All assignment evaluations:`, assignmentEvaluations);

    // Vérifier si toutes les évaluations sont complétées (non en statut 'pending')
    const allPeerEvaluationsCompleted = assignmentEvaluations.every(
      (evalItem) => evalItem.status !== "pending",
    );
    console.log(`[submitEvaluation] All peer evaluations completed: ${allPeerEvaluationsCompleted}`);

    if (allPeerEvaluationsCompleted) {
      // Si au moins une évaluation est 'rejected', l'assignation est 'rejected'
      const anyRejected = assignmentEvaluations.some(
        (evalItem) => evalItem.status === "rejected",
      );
      console.log(`[submitEvaluation] Any evaluation rejected: ${anyRejected}`);

      if (anyRejected) {
        assignment.status = "assigned"; // Réinitialiser le statut à 'assigned' pour permettre la resoumission
        assignment.repoUrl = undefined; // Effacer l'URL du dépôt
        assignment.submissionDate = undefined; // Effacer la date de soumission
        // TODO: Optionnel: effacer les évaluations existantes liées à cette assignation pour forcer de nouvelles évaluations
        // Ou marquer les anciennes comme 'annulées' si elles ne sont plus pertinentes.
        // Pour l'instant, nous laissons les anciennes évaluations telles quelles mais cela pourrait être ajusté.
        // Notifier l'étudiant que son projet a été rejeté par un évaluateur pair
        await Notification.create({
          user: assignment.student,
          type: "project_status_update",
          message: `Le statut de votre projet \'${project.title}\' est maintenant : Rejeté par un évaluateur pair. Veuillez revoir votre projet et le soumettre à nouveau.`,
        });
      } else {
        // Si toutes les évaluations sont acceptées, l'assignation passe à l'état d'attente de l'évaluation du personnel
        assignment.status = "awaiting_staff_review";
        // Notifier l'apprenant que son projet a été validé par les pairs et est en attente d'évaluation par le personnel
        await Notification.create({
          user: assignment.student,
          type: "project_status_update",
          message: `Votre projet \'${project.title}\' a été validé par les pairs et est maintenant en attente de l'évaluation finale par le personnel.`,
        });
        // Notifier TOUS les membres du personnel qu'un projet est prêt pour l'évaluation finale
        const staffUsers = await User.find({
          role: { $in: ["staff", "admin"] },
        });
        for (const staff of staffUsers) {
          await Notification.create({
            user: staff._id,
            type: "project_awaiting_staff_review",
            message: `Le projet \'${project.title}\' soumis par ${assignment.student.name} est en attente de votre évaluation finale.`,
          });
        }
      }
    }
    console.log(`[submitEvaluation] Assignment status before save: ${assignment.status}`);
    await project.save(); // Sauvegarder le projet maître pour persister les changements de l'assignation

    res
      .status(200)
      .json({ message: "Évaluation soumise avec succès.", evaluation });
  } catch (e) {
    console.error('Error submitting evaluation:', e);
    res.status(500).json({ error: e.message });
  }
}

// Nouvelle fonction pour réassigner manuellement une évaluation
export async function reassignEvaluationManually(req, res) {
  try {
    const { evaluationId } = req.params;
    const { newSlotIds } = req.body; // Modifier pour accepter un tableau de IDs

    if (!Array.isArray(newSlotIds) || newSlotIds.length !== 2) {
      return res.status(400).json({ error: "Deux IDs de slots sont requis pour la réassignation." });
    }

    if (req.user.role !== "staff" && req.user.role !== "admin") {
      return res.status(403).json({ error: "Non autorisé à effectuer cette action." });
    }

    const oldEvaluation = await Evaluation.findById(evaluationId)
      .populate("project")
      .populate("evaluator")
      .populate("student")
      .populate("slot");

    if (!oldEvaluation) {
      return res.status(404).json({ error: "Ancienne évaluation non trouvée." });
    }

    const project = oldEvaluation.project;
    if (!project) {
      return res.status(404).json({ error: "Projet lié à l'évaluation non trouvé." });
    }

    // Peupler l'assignation dans oldEvaluation pour accéder à l'ancien repoUrl
    await oldEvaluation.populate({
      path: 'project',
      populate: {
        path: 'assignments.repoUrl' // Peupler l'URL du dépôt de l'assignation
      }
    });

    const assignment = project.assignments.id(oldEvaluation.assignment);
    if (!assignment) {
      return res.status(404).json({ error: "Assignation liée à l'évaluation non trouvée." });
    }

    // Utiliser l'URL du dépôt de l'ancienne soumission si elle existe
    if (oldEvaluation.project?.assignments?.id(oldEvaluation.assignment)?.repoUrl) {
      assignment.repoUrl = oldEvaluation.project.assignments.id(oldEvaluation.assignment).repoUrl;
    }

    // 1. Marquer l'ancienne évaluation comme "cancelled"
    oldEvaluation.status = "cancelled";
    await oldEvaluation.save();

    // 2. Libérer l'ancien slot si présent (si on réassigne, l'ancien slot n'est plus pertinent pour cette évaluation)
    if (oldEvaluation.slot) {
      oldEvaluation.slot.isBooked = false;
      oldEvaluation.slot.bookedByStudent = undefined;
      oldEvaluation.slot.bookedForProject = undefined;
      oldEvaluation.slot.bookedForAssignment = undefined; // Assurez-vous d'effacer aussi cette référence
      await oldEvaluation.slot.save();
    }

    const newEvaluations = [];
    const newEvaluatorNames = [];

    for (const slotId of newSlotIds) {
      // 3. Récupérer le nouveau slot et l'évaluateur associé
      const newSlot = await AvailabilitySlot.findById(slotId).populate('evaluator');

      if (!newSlot || newSlot.isBooked) {
        return res.status(400).json({ error: `Le slot ${slotId} est invalide ou déjà réservé.` });
      }
      if (!newSlot.evaluator) {
        return res.status(400).json({ error: `Le nouveau slot ${slotId} n'a pas d'évaluateur associé.` });
      }
      const newEvaluator = newSlot.evaluator;

      // 4. Créer une nouvelle évaluation
      const newEvaluation = await Evaluation.create({
        project: oldEvaluation.project._id,
        assignment: oldEvaluation.assignment,
        evaluator: newEvaluator._id,
        student: oldEvaluation.student._id,
        slot: newSlot._id,
        status: "pending",
      });
      newEvaluations.push(newEvaluation);
      newEvaluatorNames.push(newEvaluator.name);

      // 5. Réserver le nouveau slot
      newSlot.isBooked = true;
      newSlot.bookedByStudent = oldEvaluation.student._id;
      newSlot.bookedForProject = oldEvaluation.project._id;
      newSlot.bookedForAssignment = oldEvaluation.assignment; // Ajouter cette référence
      await newSlot.save();
    }

    // 6. Mettre à jour l'assignation du projet pour inclure les nouvelles évaluations
    assignment.evaluations = assignment.evaluations.filter(
      (evalId) => !evalId.equals(oldEvaluation._id),
    );
    assignment.evaluations.push(...newEvaluations.map(e => e._id));

    // Mettre à jour les peerEvaluators avec les nouveaux évaluateurs
    const newEvaluatorIds = newEvaluations.map(e => e.evaluator);
    // Filtrer les anciens évaluateurs qui ne sont pas dans les nouveaux slots
    assignment.peerEvaluators = assignment.peerEvaluators.filter(
      (id) => !oldEvaluation.evaluator._id.equals(id)
    );
    // Ajouter les nouveaux évaluateurs s'ils ne sont pas déjà présents
    for (const newEvalId of newEvaluatorIds) {
      if (!assignment.peerEvaluators.some(id => id.equals(newEvalId))) {
        assignment.peerEvaluators.push(newEvalId);
      }
    }

    // Après réaffectation, conserver l'état "submitted" pour permettre de nouvelles évaluations et la soumission de feedback
    assignment.status = "submitted";
    assignment.submissionDate = new Date();
    await project.save();

    // 8. Envoyer les notifications
    // Notification à l'étudiant
    const newSlotStartTimes = newEvaluations.map(e => new Date(e.slot.startTime).toLocaleString()).join(' et ');
    await Notification.create({
      user: oldEvaluation.student._id,
      type: "evaluation_reassigned",
      message: `L'évaluation de votre projet \'${project.title}\' a été réassignée à ${newEvaluatorNames.join(' et ')} pour les slots du ${newSlotStartTimes}.`,
    });

    // Notification à l'ancien évaluateur (si différent des nouveaux)
    const oldEvaluatorId = oldEvaluation.evaluator._id;
    if (!newEvaluatorIds.some(id => id.equals(oldEvaluatorId))) {
      await Notification.create({
        user: oldEvaluatorId,
        type: "evaluation_cancelled",
        message: `L'évaluation du projet \'${project.title}\' de ${oldEvaluation.student.name} vous a été retirée.`, // Texte mis à jour
      });
    }

    // Notification aux nouveaux évaluateurs
    for (let i = 0; i < newEvaluations.length; i++) {
      await Notification.create({
        user: newEvaluations[i].evaluator._id,
        type: "new_evaluation_assigned",
        message: `Une nouvelle évaluation vous a été assignée pour le projet \'${project.title}\' de ${oldEvaluation.student.name} pour le slot du ${new Date(newEvaluations[i].slot.startTime).toLocaleString()}.`,
      });
    }

    res.status(200).json({ message: "Évaluation réassignée avec succès.", newEvaluations });
  } catch (e) {
    console.error('Error reassigning evaluation manually:', e);
    res.status(500).json({ error: e.message });
  }
}
