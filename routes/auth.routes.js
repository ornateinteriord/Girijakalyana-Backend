const express = require('express');
const router = express.Router();
const { login, signUp, recoverPassword, resetPassword } = require('../controllers/authController/AuthController');


router.post('/signup', signUp);
router.post('/login', login);
router.post("/recover-password",recoverPassword)
router.post("/reset-password",resetPassword)



module.exports = router;