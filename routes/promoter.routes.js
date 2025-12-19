const express = require('express');
const router = express.Router();
const PromotersModel = require('../models/promoters/Promoters');

// Check promocode validity
router.post('/promocheck', async (req, res) => {
  try {
    const { promocode, planType } = req.body;
    
    // Validate input
    if (!promocode || !promocode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Promocode is required'
      });
    }
    
    // Convert promocode to uppercase for consistency
    const upperPromocode = promocode.trim().toUpperCase();
    
    // Check if promocode exists and is active
    const promoter = await PromotersModel.findOne({ 
      promoter_id: upperPromocode,
      status: 'active'  // Only active promoters' promocodes are valid
    });
    
    if (!promoter) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promocode. Please check and try again.'
      });
    }
    
    // Promocode is valid - return success with discount info
    return res.status(200).json({
      success: true,
      message: 'Promocode applied successfully! ₹100 discount applied.',
      data: {
        promocode: upperPromocode,
        discount: 100,
        promoterName: promoter.promoter_name,
        isValid: true
      }
    });
    
  } catch (error) {
    console.error('Promocode check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while checking promocode'
    });
  }
});

module.exports = router;