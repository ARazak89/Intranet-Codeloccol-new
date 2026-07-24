import cron from "node-cron";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { getStartOfTodayInLagos } from "../utils/daysRemainingService.js";

const startDayDecrementer = () => {
  // Planifier la tâche pour s'exécuter tous les jours à minuit (Africa/Lagos)
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        console.log("[CRON] Début décrémentation des jours restants...");
        const today = getStartOfTodayInLagos();

        // 1️⃣ Décrémenter les utilisateurs actifs pas encore traités aujourd'hui
        // (évite le double débit avec le lazy decrement sur /users/me)
        const decrementResult = await User.updateMany(
          {
            status: "active",
            daysRemaining: { $gt: 0 },
            $or: [
              { lastDaysDecrementAt: { $exists: false } },
              { lastDaysDecrementAt: null },
              { lastDaysDecrementAt: { $lt: today } },
            ],
          },
          {
            $inc: { daysRemaining: -1 },
            $set: { lastDaysDecrementAt: today },
          }
        );
        console.log(
          `[CRON] ${decrementResult.modifiedCount} utilisateurs décrémentés.`
        );

        // Marquer aussi ceux déjà à 0 / déjà traités pour aligner lastDaysDecrementAt
        await User.updateMany(
          {
            status: "active",
            role: "apprenant",
            $or: [
              { lastDaysDecrementAt: { $exists: false } },
              { lastDaysDecrementAt: null },
              { lastDaysDecrementAt: { $lt: today } },
            ],
          },
          { $set: { lastDaysDecrementAt: today } }
        );

        // 2️⃣ Trouver les utilisateurs qui viennent d’atteindre 0
        const usersToBlock = await User.find({
          status: "active",
          daysRemaining: 0,
          role: "apprenant",
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
