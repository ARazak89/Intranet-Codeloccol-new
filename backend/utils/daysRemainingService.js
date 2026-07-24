import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Même fuseau que le cron dayDecrementer */
export const DAYS_TIMEZONE = "Africa/Lagos";

export function getStartOfTodayInLagos() {
  return dayjs().tz(DAYS_TIMEZONE).startOf("day").toDate();
}

/**
 * Décrémente daysRemaining selon les jours calendaires écoulés (Africa/Lagos).
 * Fiable même si le processus API dormait à minuit (hébergeur free tier, redémarrages).
 * Sans lastDaysDecrementAt : initialise à aujourd'hui sans rattrapage historique.
 */
export async function applyPendingDayDecrements(user) {
  if (!user || user.role !== "apprenant" || user.status !== "active") {
    return user;
  }

  const today = dayjs().tz(DAYS_TIMEZONE).startOf("day");
  const todayDate = today.toDate();

  if (!user.lastDaysDecrementAt) {
    const bootstrapped = await User.findOneAndUpdate(
      {
        _id: user._id,
        $or: [
          { lastDaysDecrementAt: { $exists: false } },
          { lastDaysDecrementAt: null },
        ],
      },
      { $set: { lastDaysDecrementAt: todayDate } },
      { new: true }
    );
    return bootstrapped || user;
  }

  const last = dayjs(user.lastDaysDecrementAt).tz(DAYS_TIMEZONE).startOf("day");
  const daysPassed = today.diff(last, "day");

  if (daysPassed <= 0) {
    return user;
  }

  const currentDays = Math.max(0, user.daysRemaining || 0);
  const daysToSubtract = Math.min(daysPassed, currentDays);
  const newDays = currentDays - daysToSubtract;
  // Bloquer si plus de jours, ou déjà à 0 mais encore "active"
  const shouldBlock = newDays === 0;

  const updated = await User.findOneAndUpdate(
    {
      _id: user._id,
      status: "active",
      lastDaysDecrementAt: { $lt: todayDate },
    },
    {
      ...(daysToSubtract > 0 ? { $inc: { daysRemaining: -daysToSubtract } } : {}),
      $set: {
        lastDaysDecrementAt: todayDate,
        ...(shouldBlock ? { status: "blocked" } : {}),
      },
    },
    { new: true }
  );

  if (!updated) {
    // Concurrent update (cron / autre requête) — recharger
    return (await User.findById(user._id)) || user;
  }

  if (shouldBlock && updated.status === "blocked") {
    await Notification.create({
      user: user._id,
      type: "account_blocked",
      message:
        "Votre compte a été bloqué car vous n'avez plus de jours restants. Veuillez contacter le personnel.",
    });
    console.log(
      `[DAYS] Utilisateur ${updated.email} bloqué (lazy decrement, -${daysToSubtract}j).`
    );
  } else if (daysToSubtract > 0) {
    console.log(
      `[DAYS] ${updated.email}: daysRemaining ${currentDays} → ${updated.daysRemaining} (lazy, -${daysToSubtract}j).`
    );
  }

  return updated;
}
