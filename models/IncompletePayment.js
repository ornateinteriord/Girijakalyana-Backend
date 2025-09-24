const mongoose = require('mongoose');

const IncompletePaymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  transactionId: {
    type: String,
    required: false
  },
  amount: {
    type: Number,
    required: true
  },
  customerDetails: {
    customerId: String,
    customerName: String,
    customerEmail: String,
    customerPhone: String
  },
  // Add userId field
  userId: {
    type: String,
    required: false,
    index: true
  },
  paymentMethod: {
    type: String,
    required: false
  },
  paymentStatusFromGateway: {
    type: String,
    required: true
  },
  orderStatusFromGateway: {
    type: String,
    required: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  // Add new fields for user ticket
  userDescription: {
    type: String,
    required: false
  },
  userImages: {
    type: [String], // Array of ImageKit URLs
    required: false
  },
  ticketRaised: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  adminNotified: {
    type: Boolean,
    default: false
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolutionNotes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Add indexes for common queries
IncompletePaymentSchema.index({ orderId: 1 });
IncompletePaymentSchema.index({ resolved: 1 });
IncompletePaymentSchema.index({ createdAt: -1 });
IncompletePaymentSchema.index({ ticketRaised: 1 });
IncompletePaymentSchema.index({ userId: 1 });

module.exports = mongoose.model('IncompletePayment', IncompletePaymentSchema);