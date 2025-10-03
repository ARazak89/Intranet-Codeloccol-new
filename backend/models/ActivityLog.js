import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  action: { 
    type: String, 
    required: true,
    enum: [
        //login
      'login',
      'logout', 
      //Evaluation
      'evaluation_submitted',
      'evaluation_accepted',
      'evaluation_rejected',
      //Project
      'project_assigned',
      'project_submitted',
      'project_approved',
      'project_rejected',
      // Slots
      'slot_created',
      'slot_reserved',  
      //Time spent on project   
      'time_spent_on_project',
      //Profile updated
      'profile_updated',
      'password_changed'
    ]
  },
  description: { 
    type: String, 
    required: true 
  },
  metadata: {
    // Données contextuelles selon l'action
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    evaluationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation' },
    assignmentId: { type: mongoose.Schema.Types.ObjectId },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AvailabilitySlot' },
    duration: { type: Number }, // en minutes pour time_spent_on_project
    score: { type: Number }, // pour les évaluations
    ipAddress: { type: String },
    userAgent: { type: String },
    // Autres métadonnées selon les besoins
    [mongoose.Schema.Types.Mixed]: {}
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Index pour optimiser les requêtes
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ 'metadata.projectId': 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
