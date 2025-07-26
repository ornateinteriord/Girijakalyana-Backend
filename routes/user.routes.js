const express = require('express');
const router = express.Router();
const { getProfileByRegistrationNo, updateProfile, getAllUserDetails, changePassword, searchUsersByInput, getMyMatches } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');
const {expressInterest,getSentInterests,getInterestStatus,updateInterestStatus,getReceivedInterests,getAcceptedInterests, cancelInterestRequest, getInterestCounts, getAcceptedConnections} = require('../controllers/intrestController/interestController');

// Profile routes
router.get('/profile/:registration_no', authenticateToken, getProfileByRegistrationNo);
router.put('/update-profile/:registration_no',  updateProfile);
router.post('/all-users-profiles', authenticateToken, getAllUserDetails);

// Interest routes (with authentication and consistent naming)
router.post("/interest", authenticateToken, expressInterest);
router.get("/interest/sent/:sender",authenticateToken,  getSentInterests);
router.delete('/cancel',authenticateToken, cancelInterestRequest);

router.get("/interest/status/:sender/:recipient", authenticateToken, getInterestStatus);
router.put("/interest/:registration_no", authenticateToken, updateInterestStatus);
router.get("/interest/received/:recipient", authenticateToken, getReceivedInterests);
router.get("/interest/accepted/:recipient", authenticateToken, getAcceptedInterests);
router.post("/change-password/:registration_no",authenticateToken, changePassword);
router.get("/interest-counts/:registrationNo", getInterestCounts);
router.get("/search", searchUsersByInput);
router.post("/my-matches",authenticateToken, getMyMatches);
router.get("/connections/:userId", authenticateToken, getAcceptedConnections);

module.exports = router;