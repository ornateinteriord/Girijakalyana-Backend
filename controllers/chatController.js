
const chatMessage = require("../models/chatMessage");
const Intrest = require("../models/Intrest/Intrest");

exports.getMessages = async (req, res) => {
  const { user1, user2 } = req.query;
  try {
    const messages = await chatMessage.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ sentAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  const { sender, recipient, message } = req.body;
  if (!sender || !recipient || !message) {
    return res.status(400).json({ error: 'sender, recipient, and message are required' });
  }
  try {
    // Check if there is an accepted interest between sender and recipient
    const interest = await Intrest.findOne({
      $or: [
        { sender, recipient, status: 'accepted' },
        { sender: recipient, recipient: sender, status: 'accepted' }
      ]
    });
    if (!interest) {
      return res.status(403).json({ error: 'Users are not connected. Message not allowed.' });
    }

    const chatMsg = new chatMessage({ sender, recipient, message });
    await chatMsg.save();
    res.status(201).json(chatMsg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};