const express = require('express');
const router = express.Router();
const { login, signUp,  resetPassword,  getDashboardStats, getRecentRegisters } = require('../controllers/authController/AuthController');


router.post('/signup', signUp);
router.post('/login', login);
router.post("/reset-password",resetPassword)
router.get("/dashboardstats",getDashboardStats)
router.get("/recentregisters",getRecentRegisters)




module.exports = router;