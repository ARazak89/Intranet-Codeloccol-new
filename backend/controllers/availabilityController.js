import AvailabilitySlot from "../models/AvailabilitySlot.js";
import ActivityLogger from "../utils/activityLogger.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Project from "../models/Project.js";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);

const TIMEZONE = 'Africa/Niamey';

// Fonction pour qu'un apprenant (évaluateur) crée des slots de disponibilité
export async function createAvailabilitySlot(req, res) {
  try {
    const { startTime } = req.body;
    const evaluatorId = req.user._id; // L'utilisateur connecté est l'évaluateur

    // Convertir l'heure locale (Africa/Niamey) en UTC pour le stockage
    const start = dayjs(startTime);
    const end = start.add(30, 'minutes');

    // Validation des dates
    if (!start.isValid() || !end.isValid() || start.isSameOrAfter(end)) {
      return res.status(400).json({ error: "Dates et heures invalides." });
    }

    // Nouvelle validation : La durée du slot ne doit pas dépasser 2 jours (48 heures)
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    if (end.diff(start, 'milliseconds') > twoDaysInMs) {
      return res
        .status(400)
        .json({ error: "La durée d'un slot ne peut pas dépasser 2 jours." });
    }

    // Nouvelle validation : L'heure de début du slot ne doit pas être plus de 48 heures dans le futur
    const fortyEightHoursFromNow = dayjs().add(48, 'hours').utc();
    if (start.isAfter(fortyEightHoursFromNow)) {
      return res
        .status(400)
        .json({ error: "Vous ne pouvez pas créer un slot plus de 48 heures à l'avance." });
    }

    // Vérifier si l'utilisateur est un apprenant pour appliquer la limite
    const user = await User.findById(evaluatorId).select('role');
    if (user && user.role === 'apprenant') {
      const totalSlotsCreated = await AvailabilitySlot.countDocuments({
        evaluator: evaluatorId,
      });

      if (totalSlotsCreated >= 3) {
        return res.status(400).json({
          error: "Vous avez déjà créé 3 slots de disponibilité. Vous ne pouvez pas en créer davantage.",
        });
      }
    }

    // Vérifier les contraintes horaires (9h-17h) — Week-end désormais autorisé
    const startHour = start.hour(); // Utiliser .hour() pour l'heure locale
    const endHour = end.hour();

    // Vérifier si un slot existe déjà ou chevauche cette période pour cet évaluateur
    const overlappingSlot = await AvailabilitySlot.findOne({
      evaluator: evaluatorId,
      $or: [
        { startTime: { $lt: end.toDate() }, endTime: { $gt: start.toDate() } }, // Chevauchement
        { startTime: start.toDate(), endTime: end.toDate() }, // Identique
      ],
    });

    if (overlappingSlot) {
      return res.status(400).json({
        error: "Un slot de disponibilité chevauche déjà cette période.",
      });
    }

    const newSlot = await AvailabilitySlot.create({
      evaluator: evaluatorId,
      startTime: start.toDate(),
      endTime: end.toDate(),
    });

    // Log: création de slot
    await ActivityLogger.logSlotCreated(evaluatorId, newSlot._id, req);

    res.status(201).json({
      message: "Slot de disponibilité créé avec succès.",
      slot: newSlot,
    });
  } catch (e) {
    console.error('Error creating availability slot:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour lister les slots de disponibilité disponibles
export async function getAvailableSlots(req, res) {
  try {
    // On peut ajouter des filtres ici (par date, par évaluateur, etc.)
    const { date, evaluatorId } = req.query;
    let query = { isBooked: false }; // Seulement les slots non réservés

    if (evaluatorId) {
      query.evaluator = evaluatorId;
    }

    if (date) {
      const d = dayjs.tz(date, TIMEZONE).startOf('day').utc();
      const nextDay = d.add(1, 'day');
      query.startTime = { $gte: d.toDate(), $lt: nextDay.toDate() };
    }

    const slots = await AvailabilitySlot.find(query)
      .populate("evaluator", "name profilePicture") // Populer le nom de l'évaluateur
      .sort("startTime");

    res.status(200).json(slots);
  } catch (e) {
    console.error('Error fetching available slots:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour qu'un apprenant réserve un slot
export async function bookSlot(req, res) {
  try {
    const { slotId, projectId } = req.body;
    const studentId = req.user._id; // L'apprenant qui réserve

    // Vérifier si le slot existe et est disponible
    const slot = await AvailabilitySlot.findById(slotId);
    if (!slot || slot.isBooked) {
      return res
        .status(400)
        .json({ error: "Slot de disponibilité non trouvé ou déjà réservé." });
    }

    // Vérifier que le slot n'est pas réservé par l'évaluateur lui-même
    if (slot.evaluator.equals(studentId)) {
      return res
        .status(400)
        .json({ error: "Vous ne pouvez pas réserver votre propre slot." });
    }

    // Vérifier que l'apprenant ne réserve pas deux slots pour le même projet avec un décalage insuffisant
    const existingBookingsForProject = await AvailabilitySlot.find({
      bookedByStudent: studentId,
      bookedForProject: projectId,
      isBooked: true,
    });

    for (const existingBooking of existingBookingsForProject) {
      const diffMs = Math.abs(
        dayjs(slot.startTime).diff(dayjs(existingBooking.startTime), 'milliseconds')
      );
      const diffMinutes = Math.round(diffMs / 60000);
      if (diffMinutes < 45) {
        return res.status(400).json({
          error:
            'Vous devez choisir des slots avec un décalage d\'au moins 45 minutes pour le même projet.',
        });
      }
    }

    slot.isBooked = true;
    slot.bookedByStudent = studentId;
    slot.bookedForProject = projectId;
    await slot.save();

    // Log: réservation de slot par l'étudiant
    await ActivityLogger.logSlotReserved(studentId, slot._id, projectId, req);

  // Décrémenter les points d'évaluation de l'apprenant (1 point par slot réservé)
  try {
    const student = await User.findById(studentId);
    if (student) {
      student.evaluationPoints = Math.max(0, Math.min(10, (student.evaluationPoints || 0) - 1));
      await student.save();
    }
  } catch (decrementErr) {
    console.error('Error decrementing evaluation points on slot booking:', decrementErr);
  }

    // Notifier l'évaluateur que son slot a été réservé
    await Notification.create({
      user: slot.evaluator,
      type: "slot_booked",
      message: `Votre slot de disponibilité le ${dayjs(slot.startTime).tz(TIMEZONE).format('DD/MM/YYYY HH:mm')} a été réservé pour un projet.`,
    });

    // Notifier l'apprenant qu'il a réservé un slot
    const project = await Project.findById(projectId);
    await Notification.create({
      user: studentId,
      type: "slot_booked_by_student",
      message: `Vous avez réservé un slot pour l'évaluation du projet '${project.title}' le ${dayjs(slot.startTime).tz(TIMEZONE).format('DD/MM/YYYY HH:mm')}.`,
    });

    res.status(200).json({ message: "Slot réservé avec succès.", slot });
  } catch (e) {
    console.error('Error booking slot:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour un évaluateur pour voir ses réservations
export async function getPeerBookings(req, res) {
  try {
    const evaluatorId = req.user._id;

    const bookings = await AvailabilitySlot.find({
      evaluator: evaluatorId,
      isBooked: true,
    })
      .populate("bookedByStudent", "name")
      .populate("bookedForProject", "title")
      .sort("startTime");

    res.status(200).json(bookings);
  } catch (e) {
    console.error('Error fetching peer bookings:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour qu'un apprenant voit les slots qu'il a créés
export async function getMyCreatedSlots(req, res) {
  try {
    const evaluatorId = req.user._id;

    const slots = await AvailabilitySlot.find({ evaluator: evaluatorId })
      .populate("bookedByStudent", "name")
      .populate("bookedForProject", "title")
      .sort("startTime");

    res.status(200).json(slots);
  } catch (e) {
    console.error('Error fetching my created slots:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour récupérer les créneaux disponibles pour un projet spécifique
export async function getAvailableSlotsForProject(req, res) {
  try {
    const { projectId, assignmentId } = req.params; // projectId est ici l'ID du projet maître
    const studentId = req.user._id;

    console.log(`[getAvailableSlotsForProject] Received - ProjectId: ${projectId}, AssignmentId: ${assignmentId}, StudentId: ${studentId}`);

    // Chercher le projet maître par son ID directement
    const project = await Project.findById(projectId).populate({
      path: 'assignments.student',
      select: 'name'
    });
    console.log(`[getAvailableSlotsForProject] Fetched Project:`, project);

    if (!project) {
      return res.status(404).json({
        error: 'Projet non trouvé.'
      });
    }

    // Trouver l'assignation pertinente dans le projet
    const relevantAssignment = project.assignments.id(assignmentId);
    console.log(`[getAvailableSlotsForProject] Relevant Assignment:`, relevantAssignment);

    if (!relevantAssignment || !relevantAssignment.student.equals(studentId)) {
      return res.status(404).json({
        error: 'Assignation de projet non trouvée, ou non assignée à cet étudiant.'
      });
    }

    if (relevantAssignment.status === 'approved' || relevantAssignment.status === 'rejected') {
      return res.status(400).json({
        error: 'Cette assignation de projet a déjà été évaluée.'
      });
    }

    // Récupérer tous les slots disponibles (non réservés et non expirés)
    const now = dayjs().utc().toDate();
    const availableSlots = await AvailabilitySlot.find({
      isBooked: false,
      startTime: { $gt: now }, // Seulement les slots futurs
      evaluator: { $ne: studentId } // L'étudiant ne peut pas s'évaluer lui-même
    })
    .populate('evaluator', 'name evaluationPoints') // Populer le nom et les points d'évaluation de l'évaluateur
    .sort('startTime');
    console.log(`[getAvailableSlotsForProject] Available Slots before grouping:`, availableSlots);

    // Grouper les slots par évaluateur pour vérifier qu'il y a au moins 2 évaluateurs différents
    const slotsByEvaluator = availableSlots.reduce((acc, slot) => {
      // S'assurer que slot.evaluator n'est pas null avant d'accéder à ses propriétés
      if (!slot.evaluator) {
        console.warn(`Slot ${slot._id} has a null evaluator. Skipping.`);
        return acc; // Ignorer ce slot ou le gérer autrement si nécessaire
      }
      const evaluatorId = slot.evaluator._id.toString();
      if (!acc[evaluatorId]) {
        acc[evaluatorId] = {
          evaluatorId: slot.evaluator._id,
          evaluatorName: slot.evaluator.name, // Inclure le nom de l'évaluateur
          slots: []
        };
      }
      acc[evaluatorId].slots.push(slot);
      return acc;
    }, {});

    // Convertir en tableau et s'assurer qu'il y a au moins 2 évaluateurs différents
    const evaluatorsWithSlots = Object.values(slotsByEvaluator);
    console.log(`[getAvailableSlotsForProject] Evaluators with Slots:`, evaluatorsWithSlots);

    if (evaluatorsWithSlots.length < 2) {
      return res.status(400).json({
        error: 'Il n\'y a pas assez d\'évaluateurs disponibles. Au moins 2 évaluateurs différents sont nécessaires.'
      });
    }

    // Trier les slots en fonction des points d'évaluation de l'évaluateur (les moins élevés en premier)
    // et secondairement par l'heure de début du slot.
    availableSlots.sort((a, b) => {
      const pointsA = a.evaluator?.evaluationPoints || 0;
      const pointsB = b.evaluator?.evaluationPoints || 0;

      if (pointsA === pointsB) {
        return a.startTime.getTime() - b.startTime.getTime(); // Trier par heure si les points sont égaux
      }
      return pointsA - pointsB; // Trier par points d'évaluation
    });

    const slotsWithEvaluatorInfo = availableSlots.map(slot => ({
      _id: slot._id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      evaluator: slot.evaluator ? {
        _id: slot.evaluator._id,
        name: slot.evaluator.name,
        evaluationPoints: slot.evaluator.evaluationPoints // Inclure les points d'évaluation
      } : {
        _id: null,
        name: 'Évaluateur Inconnu',
        evaluationPoints: 0
      } // Gérer le cas où l'évaluateur est null
    }));
    console.log(`[getAvailableSlotsForProject] Final Slots to send:`, slotsWithEvaluatorInfo);

    res.status(200).json(slotsWithEvaluatorInfo);
  } catch (e) {
    console.error('Error fetching available slots for project:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour un apprenant pour supprimer un slot qu'il a créé
export async function deleteAvailabilitySlot(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const slot = await AvailabilitySlot.findById(id);

    if (!slot) {
      return res.status(404).json({ error: 'Slot de disponibilité non trouvé.' });
    }

    if (slot.isBooked) {
      return res.status(400).json({ error: 'Ce slot est déjà réservé et ne peut pas être supprimé.' });
    }

    // Seul le créateur du slot (evaluator) peut le supprimer
    if (!slot.evaluator.equals(userId)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer ce slot.' });
    }

    await slot.deleteOne(); // Utiliser deleteOne() sur l'instance trouvée

    res.status(200).json({ message: 'Slot de disponibilité supprimé avec succès.' });
  } catch (e) {
    console.error('Error deleting availability slot:', e);
    res.status(500).json({ error: e.message });
  }
}

// Fonction pour expirer les slots non réservés 30 minutes avant leur début
export async function expireUnbookedSlots() {
  try {
    const now = dayjs().utc();
    // Calculer le point limite : 30 minutes avant maintenant
    const thirtyMinutesFromNow = now.add(30, 'minutes');

    const expiredSlots = await AvailabilitySlot.find({
      isBooked: false,
      startTime: { $lt: thirtyMinutesFromNow.toDate() }, // Slots dont l'heure de début est dans moins de 30 minutes
    });

    if (expiredSlots.length > 0) {
      const deleted = await AvailabilitySlot.deleteMany({
        _id: { $in: expiredSlots.map((slot) => slot._id) },
      });
      console.log(
        `Expired ${deleted.deletedCount} unbooked availability slots.`,
      );

      // Optionnel: Envoyer une notification aux évaluateurs dont les slots ont expiré
      for (const slot of expiredSlots) {
        await Notification.create({
          user: slot.evaluator,
          type: "slot_expired",
          message: `Votre slot de disponibilité le ${dayjs(slot.startTime).tz(TIMEZONE).format('DD/MM/YYYY HH:mm')} a expiré car il n'a pas été réservé.`,
        });
      }
    }
  } catch (e) {
    console.error('Error expiring unbooked slots:', e);
  }
}

export async function getAllAvailableSlots(req, res) {
  try {
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Non autorisé à consulter cette ressource.',
      });
    }

    const now = dayjs().utc().toDate();
    const slots = await AvailabilitySlot.find({
      isBooked: false,
      startTime: { $gt: now },
    })
      .populate("evaluator", "name email")
      .sort("startTime");

    res.status(200).json(slots);
  } catch (e) {
    console.error('Error fetching all available slots:', e);
    res.status(500).json({ error: e.message });
  }
}
