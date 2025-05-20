const express = require('express');
const router = express.Router();
const { getAllUserProfile, getAllUserDetails, updateProfile } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/roles.middleware');
const { getPromotersTransactions, getPromoters, getPromotersEarnings, updatePromoterStatus } = require('../controllers/promoters/PromotersController');
const {
  getAllAssistanceTransactions,
  getOnlineAllTransactions
} = require('../controllers/Transactions/TransactionController');





router.get('/all-user-details',authenticateToken,checkRole("Admin"),getAllUserDetails)
router.put('/upgrade-user/:registration_no',authenticateToken,checkRole("Admin"),updateProfile)
router.put('/reset-password/:registration_no',authenticateToken,checkRole("Admin"),updateProfile)
router.get('/all-promoters',authenticateToken,checkRole("Admin"),getPromoters)
router.get('/all-promoters-earnings',authenticateToken,checkRole("Admin"),getPromotersEarnings)
router.get('/all-promoters-transactions',authenticateToken,checkRole("Admin"),getPromotersTransactions)
router.get('/all-Assistance-transactions', authenticateToken, checkRole("Admin"), getAllAssistanceTransactions);
router.get("/online-transactions", authenticateToken, checkRole("Admin"), getOnlineAllTransactions);
router.put("/promoters/:id/status",authenticateToken,checkRole("Admin"),updatePromoterStatus);


module.exports = router;