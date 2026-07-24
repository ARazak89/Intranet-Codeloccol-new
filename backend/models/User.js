import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' }, // Ajout du champ lastName
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['apprenant', 'staff', 'admin', 'evaluator'], default: 'apprenant' },
  
  // Informations personnelles
  gender: { type: String, enum: ['Homme', 'Femme', 'Autre', ''], default: '' },
  dateOfBirth: { type: Date, default: null },
  nationality: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  
  // Contact d'urgence
  emergencyContact: {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  
  // Informations académiques
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }], // Le champ badges référence maintenant le modèle Badge
  lastLogin: { type: Date },
  level: { type: Number, default: 1 },
  profilePicture: { type: String, default: '/profile/default-avatar.jpg' },
  status: { type: String, default: 'active' },
  totalProjectsCompleted: { type: Number, default: 0 },
  daysRemaining: { type: Number, default: 0 },
  /** Dernier jour (Africa/Lagos) déjà compté pour la décrémentation — évite de rater minuit si l'API dormait */
  lastDaysDecrementAt: { type: Date, default: null },
  evaluationPoints: { type: Number, default: 2 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
