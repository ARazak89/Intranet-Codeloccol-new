import User from "../models/User.js";
import AvailabilitySlot from "../models/AvailabilitySlot.js";

export async function findAvailableEvaluatorAndSlot(excludeEvaluatorId = null) {
  const now = new Date();

  // Trouver tous les évaluateurs actifs
  let evaluators = await User.find({
    role: "evaluator",
    status: "active",
  });

  // Exclure un évaluateur si spécifié (pour éviter de réassigner au même)
  if (excludeEvaluatorId) {
    evaluators = evaluators.filter(
      (evaluator) => !evaluator._id.equals(excludeEvaluatorId),
    );
  }

  for (const evaluator of evaluators) {
    // Trouver les slots de disponibilité non réservés pour cet évaluateur dans le futur
    const availableSlot = await AvailabilitySlot.findOne({
      evaluator: evaluator._id,
      isBooked: false,
      startTime: { $gt: now }, // Le slot doit être dans le futur
    }).sort("startTime"); // Prendre le slot le plus proche

    if (availableSlot) {
      return { evaluator, slot: availableSlot };
    }
  }

  return null; // Aucun évaluateur/slot disponible trouvé
}
