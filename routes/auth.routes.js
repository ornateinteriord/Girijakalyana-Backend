const express = require('express');
const router = express.Router();
const { login, signUp, recoverPassword, resetPassword, loginMobile } = require('../controllers/authController/AuthController');


router.post('/signup', signUp);
router.post('/login', login);
router.post("/reset-password",resetPassword)




module.exports = router;