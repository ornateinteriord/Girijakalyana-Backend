const express = require('express');
const router = express.Router();
const { getProfileByRegistrationNo, updateProfile } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');




router.get('/profile/:registration_no',authenticateToken,getProfileByRegistrationNo);
router.put('/update-profile/:registration_no',authenticateToken,updateProfile);


module.exports = router;