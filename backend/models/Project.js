import mongoose from 'mongoose';

/**
 * Schéma d'assignation pour définir comment un projet est assigné à un étudiant.
 * C'est un sous-document du schéma `Project`.
 */
const assignmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['assigned', 'submitted', 'pending_review', 'awaiting_staff_review', 'approved', 'rejected', 'cancelled'], default: 'assigned' },
  repoUrl: { type: String },
  submissionDate: { type: Date },
  evaluations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation' }],
  peerEvaluators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Réfère aux étudiants qui évalueront ce projet.
  staffValidator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Réfère au membre du staff/admin qui a validé le projet.
}, { timestamps: true });

/**
 * Schéma de Mongoose pour le modèle de Projet.
 * Un projet peut être un template (géré par le staff/admin) ou une assignation à un étudiant.
 * Inclut des champs pour la description, les spécifications, les objectifs, les ressources, etc.,
 * ainsi qu'un chemin pour un fichier Markdown détaillé et un module d'appartenance.
 */
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  module: { type: String, required: true }, // Le module auquel appartient le projet (ex: "HTML / CSS").
  specifications: [{ type: String }], // Liste de chaînes pour les spécifications détaillées.
  objectives: [{ type: String }], // Liste de chaînes pour les objectifs du projet.
  exerciseStatements: [{ type: String }], // Liste de chaînes pour les énoncés d'exercices.
  resourceLinks: [{ type: String }], // Liste de chaînes pour les liens de ressources supplémentaires.
  demoVideoUrl: { type: String }, // URL d'une vidéo de démonstration du projet.
  size: { type: String, enum: ['short', 'medium', 'long'], default: 'short' }, // Taille estimée du projet.
  status: { type: String, enum: ['template', 'active', 'archived'], default: 'template' }, // Statut du projet (template, actif, archivé).
  markdownFilePath: { type: String }, // Chemin relatif vers le fichier Markdown détaillé du projet.
  order: { type: Number }, // Ordre numérique du projet dans le cursus ou pour l'affichage.
  assignments: [assignmentSchema], // Tableau de sous-documents `assignmentSchema` pour les assignations à des étudiants.
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Champ pour les projets de hackathon.
}, { timestamps: true }); // Ajoute automatiquement `createdAt` et `updatedAt`.

const Project = mongoose.model('Project', projectSchema);

export default Project;
