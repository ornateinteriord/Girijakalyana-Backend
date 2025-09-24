const express = require('express');
const router = express.Router();
const multer = require('multer');
const paymentController = require('../controllers/payment.controller');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Maximum 5 files
  }
});

// Test endpoint to verify webhook URL accessibility
router.get("/webhook-test", paymentController.webhookTest);

// Test endpoint to create a minimal order for debugging
router.post("/test-order", paymentController.createTestOrder);

// Create Order
router.post("/create-order", paymentController.createOrder);

// Manual payment verification route (fallback if webhook fails)
router.post("/verify-payment/:orderId", paymentController.verifyPayment);

// Endpoint to get a specific incomplete payment by order ID (for admin)
router.get("/incomplete-payment/:orderId", paymentController.getIncompletePayment);

// Webhook to verify payment
router.post("/webhook", paymentController.handleWebhook);

// Endpoint to retry payment verification for pending orders
router.post("/retry-payment/:orderId", paymentController.retryPayment);

// Handle payment redirect from Cashfree
router.get("/payment-redirect", paymentController.handlePaymentRedirect);

// Enhanced payment status check with retry logic
router.get("/payment-status/:orderId", paymentController.checkPaymentStatus);

// Raise ticket for incomplete payment with image upload
router.post("/incomplete-payment/raise-ticket/:orderId", upload.array('images', 5), paymentController.raiseTicket);

module.exports = router;