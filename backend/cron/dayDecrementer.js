import cron from "node-cron";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const startDayDecrementer = () => {
  // Planifier la tâche pour s'exécuter tous les jours à minuit
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        console.log("[CRON] Début décrémentation des jours restants...");

        // 1️⃣ Décrémenter tous les utilisateurs actifs avec daysRemaining > 0
        const decrementResult = await User.updateMany(
          { status: "active", daysRemaining: { $gt: 0 } },
          { $inc: { daysRemaining: -1 } }
        );
        console.log(
          `[CRON] ${decrementResult.modifiedCount} utilisateurs décrémentés.`
        );

        // 2️⃣ Trouver les utilisateurs qui viennent d’atteindre 0
        const usersToBlock = await User.find({
          status: "active",
          daysRemaining: 0,
        });

        // 3️⃣ Bloquer ces utilisateurs et créer des notifications
        for (const user of usersToBlock) {
          user.status = "blocked";
          await user.save();

          await Notification.create({
            user: user._id,
            type: "account_blocked",
            message:
              "Votre compte a été bloqué car vous n'avez plus de jours restants. Veuillez contacter le personnel.",
          });

          console.log(`[CRON] Utilisateur ${user.email} bloqué.`);
        }

        console.log("[CRON] Décrémentation terminée avec succès ✅");
      } catch (error) {
        console.error(
          "[CRON ERROR] Erreur lors de la décrémentation des jours restants:",
          error
        );
      }
    },
    {
      scheduled: true,
      timezone: "Africa/Lagos",
    }
  );

  console.log("[CRON] Tâche de décrémentation des jours restants démarrée.");
};

export default startDayDecrementer;
