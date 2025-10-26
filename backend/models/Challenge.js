import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  challengeTitle: {
    type: String,
    required: true,
    unique: true, // Le titre du challenge doit être unique
  },
  description: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    enum: ['html', 'css', 'javascript', 'mixed'], // Le langage principal du challenge
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  durationHours: {
    type: Number,
    required: true,
    min: 1,
  },
  endDate: {
    type: Date, // Calculé à partir de startDate et durationHours
  },
  resources: [
    { type: String }, // Liens ou noms de fichiers pour les ressources
  ],
  attachments: [
    { type: String }, // Pour les chemins de fichiers joints (si implémenté)
  ],
  images: [
    { type: String }, // Pour les URLs des images du challenge
  ],
  status: {
    type: String,
    enum: ['active', 'expired', 'archived'],
    default: 'active',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Pré-sauvegarde pour calculer endDate
challengeSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('durationHours')) {
    this.endDate = new Date(this.startDate.getTime() + this.durationHours * 60 * 60 * 1000);
  }
  next();
});

const Challenge = mongoose.model('Challenge', challengeSchema);

export default Challenge;
