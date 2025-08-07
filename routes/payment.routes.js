const express = require('express');
const crypto = require('crypto');
const razorpayInstance = require('../config/razorpay.config');
const router = express.Router();

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = "INR", receipt = "receipt_order_74394" } = req.body;

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post('/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    res.json({ status: "success", verified: true });
  } else {
    res.status(400).json({ status: "failure", verified: false });
  }
});

module.exports = router;
