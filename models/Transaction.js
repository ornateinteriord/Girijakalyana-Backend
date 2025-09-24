const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transcation_id: { // Note: keeping original spelling from example
    type: Number,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  registration_no: {
    type: String,
    required: true
  },
  PG_id: {
    type: String,
    required: true
  },
  bank_ref_num: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'UPI' // UPI, CC, NB, etc.
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'PENDING' // PENDING, TXN_SUCCESS, TXN_FAILURE
  },
  orderno: {
    type: String,
    required: true,
    unique: true
  },
  usertype: {
    type: String,
    required: true,
    enum: ['paidSilver', 'paidPremium']
  },
  promocode: {
    type: String,
    default: null
  },
  discount_applied: {
    type: Number,
    default: 0
  },
  original_amount: {
    type: Number,
    required: true
  }
}, { 
  collection: 'transaction_tbl',
  timestamps: true 
});

// Auto-increment transaction_id
TransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transcation_id) {
    try {
      const lastTransaction = await this.constructor.findOne({}, {}, { sort: { 'transcation_id': -1 } });
      this.transcation_id = lastTransaction ? lastTransaction.transcation_id + 1 : 1;
      console.log(`Generated transaction ID: ${this.transcation_id}`);
    } catch (error) {
      console.error('Error generating transaction ID:', error);
      // Fallback to timestamp if there's an error
      this.transcation_id = Date.now();
    }
  }
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);