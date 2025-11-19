import IdeSubmission from '../models/IdeSubmission.js';
import asyncHandler from 'express-async-handler';
import Challenge from '../models/Challenge.js'; // Importez le modèle Challenge
import Team from '../models/Team.js'; // Importez le modèle Team

// @desc    Submit an IDE project
// @route   POST /api/ide/submit-project
// @access  Private (requires authentication)
const ideSubmitProject = asyncHandler(async (req, res) => {
  const { htmlCode, cssCode, jsCode, challengeTitle, challengeId, githubRepoUrl, githubPagesUrl } = req.body; // Ajouter githubRepoUrl et githubPagesUrl

  // L'ID de l'utilisateur sera disponible via req.user après l'authentification
  // Assurez-vous que votre middleware d'authentification définit req.user
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }

  const userId = req.user._id;

  // Les champs htmlCode, cssCode, jsCode ne sont plus strictement requis ici
  // car la soumission peut se faire via GitHub URLs uniquement.
  // Cependant, challengeTitle et challengeId sont toujours nécessaires.
  if (!challengeTitle || !challengeId) {
    res.status(400);
    throw new Error('Veuillez fournir un titre de challenge et l\'ID du challenge.');
  }

  // Vérifier si au moins un des champs de soumission de code ou d'URL GitHub est fourni
  if (!(htmlCode || cssCode || jsCode || githubRepoUrl)) {
    res.status(400);
    throw new Error('Veuillez fournir au moins le code (HTML, CSS, JavaScript) ou l\'URL du dépôt GitHub.');
  }

  // Vérifier l'existence du challenge
  const challenge = await Challenge.findById(challengeId).populate('hackathonId'); // Populer hackathonId
  if (!challenge) {
    res.status(404);
    throw new Error('Challenge non trouvé.');
  }

  // Si le challenge n'est pas lié à un hackathon, la soumission est individuelle (comportement existant)
  let teamId = null;
  let hackathonId = null;

  if (challenge.hackathonId) {
    hackathonId = challenge.hackathonId._id;
    // Trouver l'équipe de l'utilisateur pour ce hackathon
    const team = await Team.findOne({ hackathon: hackathonId, members: userId });

    if (!team) {
      res.status(400);
      throw new Error('Vous devez appartenir à une équipe pour soumettre à ce hackathon.');
    }
    teamId = team._id;

    // Vérifier si l'équipe a déjà soumis pour ce challenge dans ce hackathon
    const existingTeamSubmission = await IdeSubmission.findOne({
      teamId: teamId,
      challengeId: challengeId, // Pour s'assurer que la soumission est liée au challenge dans le hackathon
    });

    if (existingTeamSubmission) {
      res.status(400);
      throw new Error('Votre équipe a déjà soumis un projet pour ce challenge dans ce hackathon.');
    }
  } else {
    // Comportement existant pour les soumissions individuelles non liées à un hackathon
    const existingUserSubmission = await IdeSubmission.findOne({
      userId,
      challengeId: challengeId,
      // Ici, nous ne vérifions plus le challengeTitle pour la soumission unique par utilisateur
      // car la soumission est unique par challengeId. Si plusieurs soumissions par challenge
      // sont autorisées, la logique devrait être adaptée.
    });

    if (existingUserSubmission) {
      res.status(400);
      throw new Error('Vous avez déjà soumis un projet pour ce challenge.');
    }
  }

  // Vérifier si le challenge est actif et non expiré (cette logique reste la même)
  const now = new Date();
  if (challenge.status !== 'active' || now < new Date(challenge.startDate) || now >= new Date(challenge.endDate)) {
    res.status(400);
    throw new Error('Impossible de soumettre à ce challenge : il n\'est pas actif ou est expiré.');
  }

  const ideSubmission = new IdeSubmission({
    userId,
    teamId, // Ajouter teamId ici
    challengeId, // Ajouter challengeId ici
    challengeTitle,
    htmlCode,
    cssCode,
    jsCode,
    githubRepoUrl,
    githubPagesUrl,
  });

  const createdIdeSubmission = await ideSubmission.save();

  res.status(201).json({
    message: 'Projet IDE soumis avec succès',
    submission: createdIdeSubmission,
  });
});

// @desc    Check if a team has already submitted for a hackathon
// @route   GET /api/ide/submission/has-submitted/:hackathonId/:teamId
// @access  Private (requires authentication and apprenant role)
const hasTeamSubmitted = asyncHandler(async (req, res) => {
  const { hackathonId, teamId } = req.params;

  const submission = await IdeSubmission.findOne({
    teamId: teamId,
    // Pour s'assurer que la soumission est liée à un challenge spécifique au sein du hackathon
    // Il faut récupérer le challengeId associé au hackathon. Pour simplifier, nous allons
    // rechercher toute soumission de cette équipe pour un challenge appartenant à ce hackathon.
    // Cette approche suppose qu'un hackathon n'a qu'un seul challenge ou qu'une soumission unique par équipe est suffisante
    // pour tout le hackathon, ce qui semble être l'intention.
    challengeId: { $in: (await Challenge.find({ hackathonId: hackathonId })).map(c => c._id) }
  });

  if (submission) {
    res.status(200).json({ hasSubmitted: true });
  } else {
    res.status(200).json({ hasSubmitted: false });
  }
});

export { ideSubmitProject, hasTeamSubmitted };
