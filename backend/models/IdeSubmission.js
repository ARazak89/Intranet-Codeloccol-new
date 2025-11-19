import mongoose from 'mongoose';

const ideSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge', // Référence au modèle Challenge
    required: false, // Sera requis si le projet est lié à un challenge spécifique
  },
  challengeTitle: {
    type: String,
    required: true,
  },
  htmlCode: {
    type: String,
    required: true,
  },
  cssCode: {
    type: String,
    required: true,
  },
  jsCode: {
    type: String,
    required: true,
  },
  submissionDate: {
    type: Date,
    default: Date.now,
  },
  correctionStatus: {
    type: String,
    enum: ['pending', 'succeeded', 'to_improve', 'not_compliant'],
    default: 'pending',
  },
  staffFeedback: {
    type: String,
  },
  rewardDays: {
    type: Number,
    default: 0,
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

const IdeSubmission = mongoose.model('IdeSubmission', ideSubmissionSchema);

export default IdeSubmission;
