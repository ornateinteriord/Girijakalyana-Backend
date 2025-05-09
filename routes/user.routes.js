const express = require('express');
const router = express.Router();
const { getProfileByRegistrationNo, updateProfile, getAllUserDetails } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');
const {expressInterest,getSentInterests,getInterestStatus,updateInterestStatus,getReceivedInterests,getAcceptedInterests} = require('../controllers/intrestController/interestController');

// Profile routes
router.get('/profile/:registration_no', authenticateToken, getProfileByRegistrationNo);
router.put('/update-profile/:registration_no',  updateProfile);
router.get('/all-users-profiles', authenticateToken, getAllUserDetails);

// Interest routes (with authentication and consistent naming)
router.post("/interest", authenticateToken, expressInterest);
router.get("/interest/sent/:senderRegistrationNo", authenticateToken, getSentInterests);
router.get("/interest/status/:senderRegistrationNo/:recipientRegistrationNo", authenticateToken, getInterestStatus);
router.put("/interest/:registration_no", authenticateToken, updateInterestStatus);
router.get("/interest/received/:recipientRegistrationNo", authenticateToken, getReceivedInterests);
router.get("/interest/accepted/:recipientRegistrationNo", authenticateToken, getAcceptedInterests);

module.exports = router;