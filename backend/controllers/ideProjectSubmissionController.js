import IdeSubmission from '../models/IdeSubmission.js';
import asyncHandler from 'express-async-handler';
import Challenge from '../models/Challenge.js'; // Importez le modèle Challenge

// @desc    Submit an IDE project
// @route   POST /api/ide/submit-project
// @access  Private (requires authentication)
const ideSubmitProject = asyncHandler(async (req, res) => {
  const { htmlCode, cssCode, jsCode, challengeTitle, challengeId } = req.body; // Ajouter challengeId

  // L'ID de l'utilisateur sera disponible via req.user après l'authentification
  // Assurez-vous que votre middleware d'authentification définit req.user
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }

  const userId = req.user._id;

  if (!htmlCode || !cssCode || !jsCode || !challengeTitle || !challengeId) { // challengeId est maintenant requis
    res.status(400);
    throw new Error('Veuillez fournir tout le code (HTML, CSS, JavaScript), un titre de challenge et l\'ID du challenge.');
  }

  // Vérifier l'existence du challenge
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge non trouvé.');
  }

  // Vérifier si le challenge est actif et non expiré
  const now = new Date();
  if (challenge.status !== 'active' || now < new Date(challenge.startDate) || now >= new Date(challenge.endDate)) {
    res.status(400);
    throw new Error('Impossible de soumettre à ce challenge : il n\'est pas actif ou est expiré.');
  }

  // Vérifier si l'utilisateur a déjà soumis un projet avec ce titre pour ce challenge (insensible à la casse)
  const existingSubmission = await IdeSubmission.findOne({
    userId,
    challengeId, // Vérifier par challengeId
    challengeTitle: { $regex: new RegExp(`^${challengeTitle}$`, 'i') },
  });

  if (existingSubmission) {
    res.status(400);
    throw new Error('Vous avez déjà soumis un projet avec ce titre de challenge pour ce challenge.');
  }

  const ideSubmission = new IdeSubmission({
    userId,
    challengeId, // Ajouter challengeId ici
    challengeTitle,
    htmlCode,
    cssCode,
    jsCode,
  });

  const createdIdeSubmission = await ideSubmission.save();

  res.status(201).json({
    message: 'Projet IDE soumis avec succès',
    submission: createdIdeSubmission,
  });
});

export { ideSubmitProject };
