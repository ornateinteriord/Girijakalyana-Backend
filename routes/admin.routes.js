const express = require('express');
const router = express.Router();
const { getAllUserProfile } = require('../controllers/profileController');
const authenticateToken = require('../middleware/auth.middleware');
const checkRole = require('../middleware/roles.middleware');
const { getPromotersTransactions, getPromoters, getPromotersEarnings } = require('../controllers/promoters/PromotersController');



router.get('/all-profiles',authenticateToken,checkRole("Admin"),getAllUserProfile)
router.get('/all-promoters',authenticateToken,checkRole("Admin"),getPromoters)
router.get('/all-promoters-earnings',authenticateToken,checkRole("Admin"),getPromotersEarnings)
router.get('/all-promoters-transactions',authenticateToken,checkRole("Admin"),getPromotersTransactions)

module.exports = router;