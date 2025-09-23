const express = require('express');
const router = express.Router();
const PromotersModel = require('../models/promoters/Promoters');

// Check promocode validity
router.post('/promocheck', async (req, res) => {
  try {
    const { promocode } = req.body;
    
    if (!promocode) {
      return res.status(400).json({
        success: false,
        message: 'Promocode is required'
      });
    }
    
    // Find promoter by promoter_id (which serves as promocode)
    const promoter = await PromotersModel.findOne({ 
      promoter_id: promocode.toUpperCase(),
      status: 'active' // Only active promoters
    });
    
    if (!promoter) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or inactive promocode'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Promocode is valid! ₹100 discount applied.',
      data: {
        promocode: promocode.toUpperCase(),
        discount: 100,
        promoter_name: promoter.promoter_name,
        promoter_id: promoter.promoter_id
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