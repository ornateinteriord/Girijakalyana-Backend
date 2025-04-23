const express = require('express');
const router = express.Router();
const { getProfileByRegistrationNo, updateProfile, getAllUserDetails } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');
const interestController = require('../controllers/intrestController/interestController');

// Profile routes
router.get('/profile/:registration_no', authenticateToken, getProfileByRegistrationNo);
router.put('/update-profile/:registration_no', authenticateToken, updateProfile);
router.get('/all-users-profiles', authenticateToken, getAllUserDetails);

// Interest routes (with authentication and consistent naming)
router.post("/interest", authenticateToken, interestController.expressInterest);
router.get("/interest/status/:senderRegistrationNo/:recipientRegistrationNo", authenticateToken, interestController.getInterestStatus);
router.put("/interest/:registration_no", authenticateToken, interestController.updateInterestStatus);
router.get("/interest/received/:recipientRegistrationNo", authenticateToken, interestController.getReceivedInterests);
router.get("/interest/accepted/:recipientRegistrationNo", authenticateToken, interestController.getAcceptedInterests);

module.exports = router;