const express = require('express');
const router = express.Router();
const { getProfileByRegistrationNo, updateProfile, getAllUserDetails } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');




router.get('/profile/:registration_no',authenticateToken,getProfileByRegistrationNo);
router.put('/update-profile/:registration_no',authenticateToken,updateProfile);
router.get('/all-users-profiles',authenticateToken,getAllUserDetails);

module.exports = router;