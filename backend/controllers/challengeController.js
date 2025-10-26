import asyncHandler from 'express-async-handler';
import Challenge from '../models/Challenge.js';
import IdeSubmission from '../models/IdeSubmission.js'; // Importez le modèle IdeSubmission
import Event from '../models/Event.js'; // Importer le modèle Event

// @desc    Create a new challenge
// @route   POST /api/challenges
// @access  Private/Admin/Staff
const createChallenge = asyncHandler(async (req, res) => {
  const { challengeTitle, description, language, startDate, durationHours, resources, attachments, images } = req.body;

  // Basic validation
  if (!challengeTitle || !description || !language || !startDate || !durationHours) {
    res.status(400);
    throw new Error('Veuillez remplir tous les champs obligatoires du challenge.');
  }

  // Check for duplicate challenge title (already handled by unique: true in schema, but good to give a specific message)
  const existingChallenge = await Challenge.findOne({ challengeTitle: { $regex: new RegExp(`^${challengeTitle}$`, 'i') } });
  if (existingChallenge) {
    res.status(400);
    throw new Error('Un challenge avec ce titre existe déjà.');
  }

  const challenge = new Challenge({
    challengeTitle,
    description,
    language,
    startDate: new Date(startDate),
    durationHours,
    resources,
    attachments,
    images, // Ajouter le champ images ici
    createdBy: req.user._id, // L'utilisateur qui crée le challenge (admin/staff)
  });

  const createdChallenge = await challenge.save();

  // Créer un événement associé au challenge
  const event = new Event({
    title: challengeTitle,
    description: description,
    startDate: new Date(startDate),
    endDate: new Date(new Date(startDate).getTime() + durationHours * 60 * 60 * 1000), // Calculer la date de fin
    category: 'challenge',
    location: 'Octogone', // Définir l'emplacement par défaut
    createdBy: req.user._id,
    challenge: createdChallenge._id, // Lien vers le challenge créé
  });

  await event.save();

  res.status(201).json(createdChallenge);
});

// @desc    Get all challenges
// @route   GET /api/challenges
// @access  Private/Admin/Staff
const getAllChallenges = asyncHandler(async (req, res) => {
  const challenges = await Challenge.find({}).populate('createdBy', 'name email');
  res.json(challenges);
});

// @desc    Get a single challenge by ID
// @route   GET /api/challenges/:id
// @access  Private/Admin/Staff
const getChallengeById = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id).populate('createdBy', 'name email');

  if (challenge) {
    res.json(challenge);
  } else {
    res.status(404);
    throw new Error('Challenge non trouvé');
  }
});

// @desc    Update an existing challenge
// @route   PUT /api/challenges/:id
// @access  Private/Admin/Staff
const updateChallenge = asyncHandler(async (req, res) => {
  const { challengeTitle, description, language, startDate, durationHours, resources, attachments, images, status } = req.body;

  const challenge = await Challenge.findById(req.params.id);

  if (challenge) {
    // Check for duplicate title if it's being changed
    if (challengeTitle && challengeTitle !== challenge.challengeTitle) {
      const existingChallenge = await Challenge.findOne({ challengeTitle: { $regex: new RegExp(`^${challengeTitle}$`, 'i') } });
      if (existingChallenge && existingChallenge._id.toString() !== req.params.id) {
        res.status(400);
        throw new Error('Un autre challenge avec ce titre existe déjà.');
      }
    }

    challenge.challengeTitle = challengeTitle || challenge.challengeTitle;
    challenge.description = description || challenge.description;
    challenge.language = language || challenge.language;
    challenge.startDate = startDate ? new Date(startDate) : challenge.startDate;
    challenge.durationHours = durationHours || challenge.durationHours;
    challenge.resources = resources || challenge.resources;
    challenge.attachments = attachments || challenge.attachments;
    challenge.images = images || challenge.images; // Ajouter la mise à jour des images ici
    challenge.status = status || challenge.status;

    const updatedChallenge = await challenge.save();
    res.json(updatedChallenge);
  } else {
    res.status(404);
    throw new Error('Challenge non trouvé');
  }
});

// @desc    Delete a challenge
// @route   DELETE /api/challenges/:id
// @access  Private/Admin/Staff
const deleteChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);

  if (challenge) {
    await challenge.deleteOne();

    // Supprimer l'événement associé
    await Event.deleteOne({ challenge: challenge._id });

    res.json({ message: 'Challenge et événement associé supprimés avec succès' });
  } else {
    res.status(404);
    throw new Error('Challenge non trouvé');
  }
});

// @desc    Get statistics for a specific challenge
// @route   GET /api/challenges/:id/stats
// @access  Private/Admin/Staff
const getChallengeStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const challenge = await Challenge.findById(id);
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge non trouvé.');
  }

  const submissions = await IdeSubmission.find({ challengeId: id });

  let totalSubmissions = submissions.length;
  let succeededSubmissions = 0;
  let totalRewardDays = 0;
  let totalSubmissionTimeInHours = 0;

  if (totalSubmissions === 0) {
    return res.json({
      successRate: 0,
      averageRewardDays: 0,
      averageSubmissionTime: 0, // En heures
      totalSubmissions: 0,
      succeededSubmissions: 0,
    });
  }

  for (const submission of submissions) {
    if (submission.correctionStatus === 'succeeded') {
      succeededSubmissions++;
    }
    totalRewardDays += submission.rewardDays;

    // Calcul du temps de soumission si la date de début du challenge est disponible
    if (challenge.startDate && submission.submissionDate) {
      const timeDiffMs = submission.submissionDate.getTime() - challenge.startDate.getTime();
      totalSubmissionTimeInHours += timeDiffMs / (1000 * 60 * 60); // Convertir en heures
    }
  }

  const successRate = (succeededSubmissions / totalSubmissions) * 100;
  const averageRewardDays = totalRewardDays / totalSubmissions;
  const averageSubmissionTime = totalSubmissionTimeInHours / totalSubmissions;

  res.json({
    successRate: parseFloat(successRate.toFixed(2)),
    averageRewardDays: parseFloat(averageRewardDays.toFixed(2)),
    averageSubmissionTime: parseFloat(averageSubmissionTime.toFixed(2)),
    totalSubmissions,
    succeededSubmissions,
  });
});

export { createChallenge, getAllChallenges, getChallengeById, updateChallenge, deleteChallenge, getChallengeStats };
