require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db.config');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const ImageKit = require('imagekit');
const projectName = process.env.PROJECT_NAME

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true 
}));

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});




// Database connection
connectDB();

// Middleware
app.use(express.json());

app.get("/image-kit-auth", (_req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);



app.get('/',(req,res) => {
  res.send(`Welcome to ${projectName} Backend`)
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
