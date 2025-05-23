const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  interest_id: {
    type: Number,
  },
  sender: { 
    type: String, 
    required: true 
  },
  recipient: { 
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
    default: 'Expressed interest in you'
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  }
}, { 
  timestamps: true,
  collection: "interests"
});


interestSchema.index({ 
  sender: 1, 
  recipient: 1 
}, { 
  unique: true,
  name: 'unique_interest'
});


interestSchema.pre('save', async function(next) {
  if (!this.isNew) {
    return next();
  }

  try {
    const lastInterest = await this.constructor.findOne({}, 'interest_id')
      .sort({ interest_id: -1 })
      .limit(1)
      .lean()
      .exec();

    this.interest_id = lastInterest ? lastInterest.interest_id + 1 : 1;
    if (!this.date) {
      this.date = new Date().toISOString().split('T')[0];
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Interest = mongoose.model('Interest', interestSchema);

module.exports = Interest;