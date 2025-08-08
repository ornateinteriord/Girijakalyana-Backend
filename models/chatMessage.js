const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  recipient: { type: String, required: true },
  message: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
}, {
  collection: 'chatmessages'
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);