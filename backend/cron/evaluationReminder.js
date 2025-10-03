import cron from "node-cron";
import Evaluation from "../models/Evaluation.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";
import { findAvailableEvaluatorAndSlot } from "../utils/evaluatorUtils.js";

const startEvaluationReminder = () => {
  cron.schedule(
    "0 * * * *", // Exécuter toutes les heures à la minute 0
    async () => {
      console.log("[CRON] Vérification des évaluations en retard...");
      try {
        const now = new Date();

        // Trouver toutes les évaluations en attente dont le slot.endTime est dépassé
        const lateEvaluations = await Evaluation.find({
          status: "pending",
        }).populate("slot").populate("project").populate("evaluator").populate("student");

        for (const evaluation of lateEvaluations) {
          if (evaluation.slot && evaluation.slot.endTime < now) {
            console.log(
              `[CRON] Évaluation en retard détectée pour le projet ${evaluation.project} par ${evaluation.evaluator}`,
            );

            // 1. Notifier le staff/admin
            const staffAndAdmins = await User.find({
              role: { $in: ["staff", "admin"] },
            });
            for (const staff of staffAndAdmins) {
              await Notification.create({
                user: staff._id,
                type: "evaluation_late",
                message:
                  `L'évaluation du projet '${evaluation.project.title}' de l'apprenant '${evaluation.student.name}' par l'évaluateur '${evaluation.evaluator.name}' est en retard.`, // Remplacer les IDs par des noms lisibles
                link: `/dashboard?tab=evaluations`,
              });
            }
            console.log("[CRON] Notifications staff/admin envoyées.");

            // 2. Annuler l'évaluation actuelle
            evaluation.status = "cancelled";
            await evaluation.save();
            console.log("[CRON] Évaluation en retard annulée.");

            // 3. Rendre le slot de disponibilité de l'évaluateur disponible
            if (evaluation.slot) {
              evaluation.slot.isBooked = false;
              evaluation.slot.bookedByStudent = null;
              evaluation.slot.bookedForProject = null;
              await evaluation.slot.save();
              console.log("[CRON] Slot de disponibilité libéré.");
            }

            // 4. Tenter de réassigner le projet
            const newAssignmentDetails = await findAvailableEvaluatorAndSlot(
              evaluation.evaluator._id,
            );

            if (newAssignmentDetails) {
              const { evaluator: newEvaluator, slot: newSlot } =
                newAssignmentDetails;

              // Réserver le nouveau slot
              newSlot.isBooked = true;
              newSlot.bookedByStudent = evaluation.student._id;
              newSlot.bookedForProject = evaluation.project._id;
              await newSlot.save();
              console.log(
                `[CRON] Nouveau slot ${newSlot._id} réservé pour ${newEvaluator.name}.`,
              );

              // Créer une nouvelle évaluation
              const newEvaluation = await Evaluation.create({
                project: evaluation.project._id,
                assignment: evaluation.assignment,
                evaluator: newEvaluator._id,
                student: evaluation.student._id,
                slot: newSlot._id,
                status: "pending",
              });
              console.log(
                `[CRON] Nouvelle évaluation ${newEvaluation._id} créée.`,
              );

              // Mettre à jour l'assignation du projet
              const project = await Project.findById(evaluation.project._id);
              if (project) {
                const assignment = project.assignments.id(evaluation.assignment);
                if (assignment) {
                  // Supprimer l'ancienne évaluation et ajouter la nouvelle
                  assignment.evaluations = assignment.evaluations.filter(
                    (evalId) => !evalId.equals(evaluation._id),
                  );
                  assignment.evaluations.push(newEvaluation._id);

                  // Mettre à jour le pair évaluateur si applicable
                  if (assignment.peerEvaluators.includes(evaluation.evaluator._id)) {
                    assignment.peerEvaluators = assignment.peerEvaluators.filter(
                      (id) => !id.equals(evaluation.evaluator._id),
                    );
                    assignment.peerEvaluators.push(newEvaluator._id);
                  }
                   // TODO: Gérer staffValidator si l'évaluateur précédent était un staff. Pour l'instant on suppose que c'est un peer evaluator

                  await project.save();
                  console.log(
                    `[CRON] Assignation de projet ${assignment._id} mise à jour.`,
                  );
                }
              }

              // Notifier l'apprenant
              await Notification.create({
                user: evaluation.student._id,
                type: "evaluation_reassigned",
                message: `Votre projet '${evaluation.project.title}' a été réassigné à un nouvel évaluateur: '${newEvaluator.name}'.`,
                link: `/dashboard?tab=evaluations`,
              });
              console.log(
                `[CRON] Notification envoyée à l'apprenant ${evaluation.student.name}.`,
              );

              // Notifier le nouvel évaluateur
              await Notification.create({
                user: newEvaluator._id,
                type: "new_evaluation_assigned",
                message: `Un nouveau projet, '${evaluation.project.title}' de l'apprenant '${evaluation.student.name}', vous a été assigné pour évaluation.`,
                link: `/dashboard?tab=corrections`,
              });
              console.log(
                `[CRON] Notification envoyée au nouvel évaluateur ${newEvaluator.name}.`,
              );
            } else {
              console.warn(
                `[CRON] Aucun nouvel évaluateur disponible pour le projet ${evaluation.project.title}. Réaffectation manuelle nécessaire.`,
              );
              await Notification.create({
                user: staffAndAdmins[0]?._id, // Envoyer au premier staff/admin trouvé
                type: "manual_reassignment_needed",
                message: `Le projet '${evaluation.project.title}' de l'apprenant '${evaluation.student.name}' nécessite une réaffectation manuelle car aucun évaluateur disponible n'a été trouvé.`,
                link: `/dashboard?tab=evaluations`,
              });
            }
          }
        }

        console.log("[CRON] Vérification des évaluations en retard terminée.");
      } catch (error) {
        console.error(
          "[CRON ERROR] Erreur lors de la vérification des évaluations en retard:",
          error,
        );
      }
    },
    {
      scheduled: true,
      timezone: "Africa/Lagos", // Assurez-vous que c'est le même fuseau horaire que les autres cron jobs
    },
  );
  console.log("[CRON] Tâche de rappel d'évaluation démarrée.");
};

export default startEvaluationReminder;
