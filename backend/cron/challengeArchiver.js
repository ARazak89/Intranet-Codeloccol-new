import cron from "node-cron";
import Challenge from "../models/Challenge.js";

const startChallengeArchiver = () => {
  // Planifier la tâche pour s'exécuter tous les jours à 2h00 du matin
  // Cela donne un peu de temps après minuit pour que toutes les opérations du jour précédent soient terminées
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        console.log("[CRON] Début de l'archivage des challenges expirés...");

        const now = new Date();

        // Trouver les challenges actifs dont la date de fin est passée
        const expiredChallenges = await Challenge.find({
          status: "active",
          endDate: { $lt: now },
        });

        if (expiredChallenges.length > 0) {
          for (const challenge of expiredChallenges) {
            challenge.status = "expired"; // Ou "archived" selon la logique désirée
            await challenge.save();
            console.log(`[CRON] Challenge expiré : \"${challenge.challengeTitle}\" (ID: ${challenge._id}) marqué comme \"expired\".`);
          }
          console.log(`[CRON] ${expiredChallenges.length} challenges marqués comme expirés.`);
        } else {
          console.log("[CRON] Aucun challenge expiré trouvé.");
        }

        console.log("[CRON] Archivage des challenges terminé avec succès ✅");
      } catch (error) {
        console.error(
          "[CRON ERROR] Erreur lors de l'archivage des challenges:",
          error
        );
      }
    },
    {
      scheduled: true,
      timezone: "Africa/Lagos", // Assurez-vous que le fuseau horaire correspond à votre application
    }
  );

  console.log("[CRON] Tâche d'archivage des challenges démarrée.");
};

export default startChallengeArchiver;
