import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['hackathon', 'evaluation', 'formation', 'reunion', 'deadline', 'autre'], 
    default: 'autre' 
  },
  location: { 
    type: String, 
    default: '' 
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  responsables: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  isAllDay: { 
    type: Boolean, 
    default: false 
  },
  color: { 
    type: String, 
    default: '#179349' 
  },
  status: { 
    type: String, 
    enum: ['planifie', 'en_cours', 'termine', 'annule'], 
    default: 'planifie' 
  },
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
export default Event;

