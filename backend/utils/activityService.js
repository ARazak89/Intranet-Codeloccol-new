import User from "../models/User.js";
import Notification from "../models/Notification.js";

export async function autoBlockInactiveUsers() {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // 4 jours d'inactivité

  try {
    // Trouver les apprenants actifs qui ne se sont pas connectés depuis 4 jours
    const inactiveStudents = await User.find({
      role: "apprenant",
      status: "active",
      lastLogin: { $lt: fourDaysAgo },
    });

    if (inactiveStudents.length > 0) {
      console.log(
        `[CRON] Blocage de ${inactiveStudents.length} apprenants inactifs...`,
      );

      for (const student of inactiveStudents) {
        student.status = "blocked";
        await student.save();

        // Créer une notification pour l'apprenant bloqué
        await Notification.create({
          user: student._id,
          type: "account_blocked_inactivity",
          message:
            "Votre compte a été bloqué pour inactivité (plus de 4 jours sans connexion). Veuillez contacter le personnel pour le réactiver.",
        });
        console.log(
          `[CRON] Apprenant ${student.email} bloqué pour inactivité.`,
        );
      }
    }

    console.log("[CRON] Vérification des utilisateurs inactifs terminée.");
  } catch (error) {
    console.error(
      "[CRON ERROR] Erreur lors du blocage des utilisateurs inactifs:",
      error,
    );
  }
}

export async function attachLastSeen(req, res, next) {
  console.log('attachLastSeen middleware called.'); // Log de début de middleware
  const end = res.end;
  res.end = async function (...args) {
    try {
      if (req.user) {
        console.log(`Updating lastLogin for user: ${req.user.email}`); // Log avant la mise à jour
        req.user.lastLogin = new Date();
        await req.user.save();
        console.log(`lastLogin updated successfully for user: ${req.user.email}`); // Log après la mise à jour
      }
    } catch (error) {
      console.error("Error updating lastLogin:", error);
    }
    end.apply(this, args);
  };
  next();
}
