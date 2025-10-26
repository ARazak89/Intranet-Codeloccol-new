import asyncHandler from 'express-async-handler';
import IdeSubmission from '../models/IdeSubmission.js';
import Challenge from '../models/Challenge.js';
import Notification from '../models/Notification.js'; // Importez le modèle Notification
import User from '../models/User.js'; // Importez le modèle User

// @desc    Get all submissions for a specific challenge
// @route   GET /api/ide-submissions/challenges/:challengeId
// @access  Private/Admin/Staff
const getChallengeSubmissions = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  const { language, correctionStatus, studentName } = req.query; // Filtres

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge non trouvé.');
  }

  let query = { challengeId };

  if (language) {
    // Pour l'instant, IdeSubmission ne stocke pas le langage, mais si nous l'ajoutons plus tard,
    // ce filtre pourrait être étendu. Pour l'instant, on peut assumer que le langage du challenge suffit.
    // Ou, si on veut filtrer le code JS/HTML/CSS directement, il faudrait une approche différente.
  }

  if (correctionStatus) {
    query.correctionStatus = correctionStatus;
  }

  if (studentName) {
    // Trouver les IDs des utilisateurs correspondant au nom
    const users = await IdeSubmission.distinct('userId', { // Utiliser distinct pour trouver les userId associés
      challengeId,
      'user.name': { $regex: new RegExp(studentName, 'i') } // Recherche insensible à la casse sur le nom d'utilisateur
    });
    if (users.length > 0) {
      query.userId = { $in: users };
    } else {
      // Si aucun utilisateur ne correspond, renvoyer une liste vide
      return res.json([]);
    }
  }

  const submissions = await IdeSubmission.find(query)
    .populate('userId', 'name email') // Populer les infos de l'apprenant
    .sort({ submissionDate: -1 }); // Tri par date de soumission la plus récente

  res.json(submissions);
});

// @desc    Get a single IDE submission by ID
// @route   GET /api/ide-submissions/:id
// @access  Private/Admin/Staff
const getIdeSubmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const submission = await IdeSubmission.findById(id)
    .populate('userId', 'name email') // Populer les infos de l'apprenant
    .populate('reviewerId', 'name email'); // Populer les infos du correcteur

  if (submission) {
    res.json({ submission });
  } else {
    res.status(404);
    throw new Error('Soumission non trouvée.');
  }
});

// @desc    Review and evaluate an IDE submission
// @route   PUT /api/ide-submissions/:id/review
// @access  Private/Admin/Staff
const reviewIdeSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { correctionStatus, staffFeedback, rewardDays } = req.body;

  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }
  const reviewerId = req.user._id;

  const submission = await IdeSubmission.findById(id);

  if (!submission) {
    res.status(404);
    throw new Error('Soumission non trouvée');
  }

  // Validate input for correction
  if (!correctionStatus) {
    res.status(400);
    throw new Error('Le statut de correction est requis.');
  }

  submission.correctionStatus = correctionStatus;
  submission.staffFeedback = staffFeedback || '';
  submission.rewardDays = rewardDays !== undefined ? rewardDays : 0;
  submission.reviewerId = reviewerId;

  const updatedSubmission = await submission.save();

  // Créer une notification pour l'apprenant
  let notificationMessage = `Votre soumission pour le challenge \"${submission.challengeTitle}\" a été corrigée. Statut: ${correctionStatus}.`;
  if (rewardDays > 0) {
    notificationMessage += ` Vous avez reçu ${rewardDays} jours de récompense.`;

    // Mettre à jour les daysRemaining de l'utilisateur
    const user = await User.findById(submission.userId);
    if (user) {
      user.daysRemaining = (user.daysRemaining || 0) + rewardDays;
      await user.save();
    }
  }
  if (staffFeedback) {
    notificationMessage += ` Feedback: \"${staffFeedback.substring(0, 100)}...\"`; // Limiter le feedback dans la notif
  }

  const notification = new Notification({
    user: submission.userId,
    type: 'submission_review',
    message: notificationMessage,
  });
  await notification.save();

  res.json({
    message: 'Soumission mise à jour avec succès',
    submission: updatedSubmission,
  });
});

export { getChallengeSubmissions, getIdeSubmissionById, reviewIdeSubmission };
