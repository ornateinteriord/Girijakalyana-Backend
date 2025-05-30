const express = require('express');
const router = express.Router();
const { login, signUp, recoverPassword, resetPassword, loginMobile, getDashboardStats } = require('../controllers/authController/AuthController');


router.post('/signup', signUp);
router.post('/login', login);
router.post("/reset-password",resetPassword)
router.get("/dashboardstats",getDashboardStats)




module.exports = router;