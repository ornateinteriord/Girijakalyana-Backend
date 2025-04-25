const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Profile', 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Profile', 
  },
  first_name:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',

  },
 last_name:{
  type: mongoose.Schema.Types.ObjectId,
  ref:'Profile', 
 },
 age:{
  type: mongoose.Schema.Types.ObjectId,
  ref:'Profile', 
 },
  senderRegistrationNo: { 
    type: String, 
    required: true 
  },
  recipientRegistrationNo: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'], 
    default: 'pending' 
  },
  message: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true,
  // Auto-create createdAt and updatedAt fields
});

// Add compound index to prevent duplicate interests
interestSchema.index({ 
  sender: 1, 
  recipient: 1 
}, { 
  unique: true,
  name: 'unique_interest' // Give the index a name
});

// Update timestamp middleware
interestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Interest = mongoose.model('Interest', interestSchema);

module.exports = Interest;