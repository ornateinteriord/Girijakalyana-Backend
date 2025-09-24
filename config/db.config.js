const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log('MongoDB URI:', uri ? 'Present' : 'Missing');
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;