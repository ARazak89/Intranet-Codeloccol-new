import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Récupérer tous les événements
export async function getAllEvents(req, res) {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('responsables', 'name email role')
      .sort({ startDate: 1 });

    res.status(200).json(events);
  } catch (e) {
    console.error("Error fetching events:", e);
    res.status(500).json({ error: e.message });
  }
}

// Créer un nouvel événement (admin/staff uniquement)
export async function createEvent(req, res) {
  try {
    const { title, description, startDate, endDate, type, location, participants, responsables, isAllDay, color } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Le titre, la date de début et la date de fin sont requis.' });
    }

    // Vérifier que l'utilisateur est admin ou staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Seuls les administrateurs et le staff peuvent créer des événements.' });
    }

    const newEvent = new Event({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type: type || 'autre',
      location,
      participants: participants || [],
      responsables: responsables || [],
      createdBy: req.user._id,
      isAllDay: isAllDay || false,
      color: color || '#179349',
      status: 'planifie',
    });

    await newEvent.save();

    // Populer les champs pour la réponse
    await newEvent.populate('createdBy', 'name email');
    await newEvent.populate('participants', 'name email');
    await newEvent.populate('responsables', 'name email role');

    // Créer des notifications pour tous les utilisateurs
    const allUsers = await User.find({ status: 'active' }).select('_id');
    
    const notifications = allUsers.map(user => ({
      user: user._id,
      type: 'event_created',
      message: `Nouvel événement : "${title}" le ${new Date(startDate).toLocaleDateString('fr-FR')}`,
      relatedId: newEvent._id,
      relatedModel: 'Event',
    }));

    await Notification.insertMany(notifications);

    console.log(`Événement créé: ${title}. Notifications envoyées à ${allUsers.length} utilisateurs.`);

    res.status(201).json({
      message: 'Événement créé avec succès.',
      event: newEvent,
    });
  } catch (e) {
    console.error("Error creating event:", e);
    res.status(500).json({ error: e.message });
  }
}

// Mettre à jour un événement
export async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, type, location, participants, responsables, isAllDay, color, status } = req.body;

    // Vérifier que l'utilisateur est admin ou staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Seuls les administrateurs et le staff peuvent modifier des événements.' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    // Mettre à jour les champs
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (type) event.type = type;
    if (location !== undefined) event.location = location;
    if (participants !== undefined) event.participants = participants;
    if (responsables !== undefined) event.responsables = responsables;
    if (isAllDay !== undefined) event.isAllDay = isAllDay;
    if (color) event.color = color;
    if (status) event.status = status;

    await event.save();
    await event.populate('createdBy', 'name email');
    await event.populate('participants', 'name email');
    await event.populate('responsables', 'name email role');

    res.status(200).json({
      message: 'Événement mis à jour avec succès.',
      event,
    });
  } catch (e) {
    console.error("Error updating event:", e);
    res.status(500).json({ error: e.message });
  }
}

// Supprimer un événement
export async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est admin ou staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Seuls les administrateurs et le staff peuvent supprimer des événements.' });
    }

    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    // Supprimer les notifications associées
    await Notification.deleteMany({ relatedId: id, relatedModel: 'Event' });

    res.status(200).json({ message: 'Événement supprimé avec succès.' });
  } catch (e) {
    console.error("Error deleting event:", e);
    res.status(500).json({ error: e.message });
  }
}

// Récupérer un événement par ID
export async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate('createdBy', 'name email')
      .populate('participants', 'name email')
      .populate('responsables', 'name email role');

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    res.status(200).json(event);
  } catch (e) {
    console.error("Error fetching event:", e);
    res.status(500).json({ error: e.message });
  }
}

