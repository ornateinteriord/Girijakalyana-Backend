const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const FormData = require('form-data');
const Transaction = require('../models/Transaction');
const Profile = require('../models/profile');
const UserModel = require('../models/user');
const PromotersEarningsModel = require('../models/promoters/PromotersEarnings');
const IncompletePayment = require('../models/IncompletePayment');
require('dotenv').config();

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg/orders";

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
router.get("/webhook-test", (req, res) => {
  console.log('Webhook test endpoint accessed');
  res.json({ 
    message: "Webhook endpoint is accessible", 
    timestamp: new Date().toISOString(),
    url: `${process.env.BACKEND_URL}/api/payment/webhook`
  });
});

// Test endpoint to create a minimal order for debugging
router.post("/test-order", async (req, res) => {
  try {
    const testOrderId = `test_${Date.now()}`;
    
    const minimalOrderData = {
      order_id: testOrderId,
      order_amount: 1.00, // Minimum amount
      order_currency: "INR",
      customer_details: {
        customer_id: "9999999999",
        customer_name: "Test User",
        customer_email: "test@example.com",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/user/userDashboard?order_id=${testOrderId}&test=true`,
        notify_url: `${process.env.BACKEND_URL}/api/payment/webhook`
      }
    };

    console.log('Creating test order:', testOrderId);
    
    const response = await axios.post(
      CASHFREE_BASE_URL,
      minimalOrderData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
        timeout: 30000,
      }
    );
    
    console.log('✅ Test order created successfully');
    res.json({
      success: true,
      message: 'Test order created successfully',
      data: response.data
    });
    
  } catch (error) {
    console.error('❌ Test order creation failed:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Test order creation failed',
      details: error.response?.data || error.message
    });
  }
});

// Create Order
router.post("/create-order", async (req, res) => {
  try {
    const { orderId, orderAmount, customerName, customerEmail, customerPhone, planType, promocode, originalAmount } = req.body;

    // Validate required fields
    if (!orderId || !orderAmount || !customerName || !customerEmail || !customerPhone) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['orderId', 'orderAmount', 'customerName', 'customerEmail', 'customerPhone']
      });
    }

    console.log('Creating payment order:', {
      orderId,
      orderAmount,
      customerName,
      customerEmail,
      customerPhone,
      planType,
      promocode,
      originalAmount
    });

    // Ensure all required data is properly formatted
    const parsedAmount = Math.round(parseFloat(orderAmount) * 100) / 100; // Round to 2 decimal places
    
    const orderData = {
      order_id: String(orderId),
      order_amount: parsedAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: String(customerPhone).replace(/[^0-9]/g, ''), // Only digits
        customer_name: String(customerName).trim(),
        customer_email: String(customerEmail).trim().toLowerCase(),
        customer_phone: String(customerPhone).replace(/[^0-9]/g, ''), // Only digits
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/user/userDashboard`,
        notify_url: `${process.env.BACKEND_URL}/api/payment/webhook`
      }
    };

    // Add metadata as order_note (safer than order_tags)
    const metadata = {
      planType: String(planType || 'silver'),
      promocode: promocode ? String(promocode) : null,
      originalAmount: originalAmount ? parseFloat(originalAmount) : parsedAmount
    };
    
    orderData.order_note = JSON.stringify(metadata);

    console.log('Final order data to send:', {
      order_id: orderData.order_id,
      order_amount: orderData.order_amount,
      order_currency: orderData.order_currency,
      customer_id: orderData.customer_details.customer_id,
      customer_name: orderData.customer_details.customer_name,
      customer_email: orderData.customer_details.customer_email,
      customer_phone: orderData.customer_details.customer_phone,
      return_url: orderData.order_meta.return_url,
      notify_url: orderData.order_meta.notify_url,
      order_note: orderData.order_note
    });

    const response = await axios.post(
      CASHFREE_BASE_URL,
      orderData,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    console.log('✅ Order created successfully:', orderId);
    console.log('Cashfree response:', {
      cf_order_id: response.data.cf_order_id,
      order_status: response.data.order_status,
      payment_session_id: response.data.payment_session_id
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Create order error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create payment order';
    let statusCode = 500;
    
    if (error.response?.status === 400) {
      errorMessage = 'Invalid payment data provided';
      statusCode = 400;
    } else if (error.response?.status === 401) {
      errorMessage = 'Payment gateway authentication failed';
      statusCode = 401;
    } else if (error.response?.status === 422) {
      errorMessage = 'Payment gateway validation failed';
      statusCode = 422;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Payment gateway connection failed';
      statusCode = 503;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Payment gateway request timeout';
      statusCode = 504;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.response?.data || error.message,
      orderId: orderId
    });
  }
});

// Manual payment verification route (fallback if webhook fails)
router.post("/verify-payment/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Validate order ID
    if (!orderId || orderId.includes('{') || orderId.includes('}') || 
        orderId.includes('KTAqpwFjFCDenUW6j_Yo1xEJv9-Y5Ng_42YTJk9YQt4N0EW7yy3nOgEpayment')) {
      return res.status(400).json({ 
        error: 'Invalid order ID',
        message: 'Order ID contains invalid characters'
      });
    }
    
    console.log(`Manual payment verification for order: ${orderId}`);
    
    // Check if this order has already been processed
    const existingTransaction = await Transaction.findOne({ orderno: orderId });
    if (existingTransaction && existingTransaction.status === 'TXN_SUCCESS') {
      console.log(`Order ${orderId} already processed successfully`);
      return res.json({ 
        success: true, 
        message: 'Payment already processed successfully',
        orderStatus: 'PAID',
        paymentStatus: 'SUCCESS',
        alreadyProcessed: true
      });
    }
    
    // Check Cashfree API for payment status
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/${orderId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
      }
    );
    
    const orderData = response.data;
    console.log('Order status from Cashfree:', JSON.stringify(orderData, null, 2));
    
    // Handle the specific case where order is PAID but payment status is NOT_ATTEMPTED
    // This can happen when Cashfree has processed the order but hasn't updated the payment status yet
    if (orderData.order_status === 'PAID' && orderData.payment_status === 'NOT_ATTEMPTED') {
      console.log('Handling PAID order with NOT_ATTEMPTED payment status');
      
      // Save this incomplete payment for admin review
      await saveIncompletePayment({
        orderId: orderData.order_id,
        amount: orderData.order_amount,
        customerDetails: {
          customerId: orderData.customer_details?.customer_id,
          customerName: orderData.customer_details?.customer_name,
          customerEmail: orderData.customer_details?.customer_email,
          customerPhone: orderData.customer_details?.customer_phone
        },
        userId: orderData.customer_details?.customer_id, // Use customer ID as user ID
        paymentMethod: orderData.payment_method,
        paymentStatusFromGateway: orderData.payment_status,
        orderStatusFromGateway: orderData.order_status,
        gatewayResponse: orderData
      });
      
      // Wait a moment and check again
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      // Check again
      const secondResponse = await axios.get(
        `${CASHFREE_BASE_URL}/${orderId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "x-api-version": "2022-09-01",
          },
        }
      );
      
      const secondOrderData = secondResponse.data;
      console.log('Second check order status from Cashfree:', JSON.stringify(secondOrderData, null, 2));
      
      if (secondOrderData.order_status === 'PAID' && secondOrderData.payment_status === 'SUCCESS') {
        // Now it's successful, process it
        console.log('Payment now showing as SUCCESS, processing...');
        const webhookData = {
          type: 'PAYMENT_SUCCESS_WEBHOOK',
          data: {
            order: secondOrderData,
            payment: {
              cf_payment_id: secondOrderData.cf_order_id,
              payment_status: 'SUCCESS',
              payment_method: secondOrderData.payment_method || 'UPI'
            },
            customer_details: secondOrderData.customer_details
          }
        };
        
        await processSuccessfulPayment({
          orderId: secondOrderData.order_id,
          paymentId: secondOrderData.cf_order_id,
          orderAmount: secondOrderData.order_amount,
          paymentData: webhookData.data
        });
        
        // Mark the incomplete payment as resolved
        await IncompletePayment.updateOne(
          { orderId: secondOrderData.order_id },
          { 
            resolved: true,
            resolutionNotes: 'Payment successfully processed on second attempt'
          }
        );
        
        res.json({ 
          success: true, 
          message: 'Payment verified and processed successfully',
          orderStatus: secondOrderData.order_status,
          paymentStatus: secondOrderData.payment_status
        });
      } else if (secondOrderData.order_status === 'PAID' && secondOrderData.payment_status === 'NOT_ATTEMPTED') {
        // Still NOT_ATTEMPTED after second check, this might be a Cashfree issue
        console.log('Still NOT_ATTEMPTED after second check, checking for payment data');
        
        // Let's check if there's any payment data that indicates success
        if (secondOrderData.payments && secondOrderData.payments.length > 0) {
          const latestPayment = secondOrderData.payments[0]; // Assuming first payment is the latest
          console.log('Found payment data:', JSON.stringify(latestPayment, null, 2));
          
          if (latestPayment.status === 'SUCCESS') {
            console.log('Payment data shows SUCCESS, processing based on payment data');
            
            // Check if already processed
            const existingTransaction = await Transaction.findOne({ orderno: orderId });
            if (existingTransaction && existingTransaction.status === 'TXN_SUCCESS') {
              console.log(`Order ${orderId} already processed successfully`);
              // Mark the incomplete payment as resolved
              await IncompletePayment.updateOne(
                { orderId: secondOrderData.order_id },
                { 
                  resolved: true,
                  resolutionNotes: 'Payment already processed successfully'
                }
              );
              return res.json({ 
                success: true, 
                message: 'Payment already processed successfully',
                orderStatus: 'PAID',
                paymentStatus: 'SUCCESS',
                alreadyProcessed: true
              });
            }
            
            // Process based on payment data even if overall status is NOT_ATTEMPTED
            const webhookData = {
              type: 'PAYMENT_SUCCESS_WEBHOOK',
              data: {
                order: secondOrderData,
                payment: {
                  cf_payment_id: latestPayment.cf_payment_id,
                  payment_status: 'SUCCESS',
                  payment_method: latestPayment.payment_method || 'UPI'
                },
                customer_details: secondOrderData.customer_details
              }
            };
            
            await processSuccessfulPayment({
              orderId: secondOrderData.order_id,
              paymentId: latestPayment.cf_payment_id,
              orderAmount: secondOrderData.order_amount,
              paymentData: webhookData.data
            });
            
            // Mark the incomplete payment as resolved
            await IncompletePayment.updateOne(
              { orderId: secondOrderData.order_id },
              { 
                resolved: true,
                resolutionNotes: 'Payment processed based on payment data'
              }
            );
            
            res.json({ 
              success: true, 
              message: 'Payment verified and processed successfully',
              orderStatus: secondOrderData.order_status,
              paymentStatus: latestPayment.status
            });
          } else {
            // Payment not completed
            console.log('Payment data does not show SUCCESS');
            res.json({ 
              success: false, 
              message: 'Payment not completed',
              orderStatus: secondOrderData.order_status,
              paymentStatus: latestPayment.status || 'NOT_ATTEMPTED'
            });
          }
        } else {
          // No payment data, still not completed
          console.log('No payment data found');
          res.json({ 
            success: false, 
            message: 'Payment not completed',
            orderStatus: secondOrderData.order_status,
            paymentStatus: secondOrderData.payment_status
          });
        }
      } else {
        // Other status combinations
        console.log('Other status combination after second check');
        res.json({ 
          success: false, 
          message: 'Payment not completed',
          orderStatus: secondOrderData.order_status || 'NOT_CREATED',
          paymentStatus: secondOrderData.payment_status || 'NOT_ATTEMPTED'
        });
      }
    }
    // Check if payment was actually completed
    // Only process as successful if order_status is 'PAID' AND payment is confirmed
    else if (orderData.order_status === 'PAID' && orderData.payment_status === 'SUCCESS') {
      console.log('Order and payment both show SUCCESS, processing...');
      
      // Simulate webhook data structure for processing
      const webhookData = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: orderData,
          payment: {
            cf_payment_id: orderData.cf_order_id,
            payment_status: 'SUCCESS',
            payment_method: orderData.payment_method || 'UPI'
          },
          customer_details: orderData.customer_details
        }
      };
      
      await processSuccessfulPayment({
        orderId: orderData.order_id,
        paymentId: orderData.cf_order_id,
        orderAmount: orderData.order_amount,
        paymentData: webhookData.data
      });
      
      res.json({ 
        success: true, 
        message: 'Payment verified and processed successfully',
        orderStatus: orderData.order_status,
        paymentStatus: orderData.payment_status
      });
    } else if (orderData.order_status === 'PAID') {
      // Order is marked as PAID in Cashfree - trust this status and process payment successfully
      console.log('Order status is PAID in Cashfree, processing payment successfully...');
      
      // Check if there's any payment data to use
      let paymentId = orderData.cf_order_id;
      let paymentMethod = orderData.payment_method || 'UPI';
      
      // If there are payments array, use the first successful payment or just the first payment
      if (orderData.payments && orderData.payments.length > 0) {
        const successfulPayment = orderData.payments.find(p => p.status === 'SUCCESS');
        const paymentToUse = successfulPayment || orderData.payments[0];
        paymentId = paymentToUse.cf_payment_id;
        paymentMethod = paymentToUse.payment_method || paymentMethod;
        console.log('Using payment data:', JSON.stringify(paymentToUse, null, 2));
      }
      
      // Simulate webhook data structure for processing
      const webhookData = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: orderData,
          payment: {
            cf_payment_id: paymentId,
            payment_status: 'SUCCESS',
            payment_method: paymentMethod
          },
          customer_details: orderData.customer_details
        }
      };
      
      await processSuccessfulPayment({
        orderId: orderData.order_id,
        paymentId: paymentId,
        orderAmount: orderData.order_amount,
        paymentData: webhookData.data
      });
      
      res.json({ 
        success: true, 
        message: 'Payment verified and processed successfully',
        orderStatus: orderData.order_status,
        paymentStatus: 'SUCCESS'
      });
    } else {
      // Payment not completed
      console.log('Payment not completed, order status:', orderData.order_status, 'payment status:', orderData.payment_status);
      res.json({ 
        success: false, 
        message: 'Payment not completed',
        orderStatus: orderData.order_status || 'NOT_CREATED',
        paymentStatus: orderData.payment_status || 'NOT_ATTEMPTED'
      });
    }
    
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    
    // If it's a malformed order ID, return a proper error response
    if (error.message && (error.message.includes('Invalid order ID') || 
        req.params.orderId.includes('{') || req.params.orderId.includes('}') ||
        req.params.orderId.includes('KTAqpwFjFCDenUW6j_Yo1xEJv9-Y5Ng_42YTJk9YQt4N0EW7yy3nOgEpayment'))) {
      return res.status(400).json({ 
        error: 'Invalid order ID',
        message: 'Order ID contains invalid characters'
      });
    }
    
    res.status(500).json({ 
      error: 'Payment verification failed', 
      details: error.response?.data || error.message 
    });
  }
});

// Endpoint to get a specific incomplete payment by order ID (for admin)
router.get("/incomplete-payment/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const incompletePayment = await IncompletePayment.findOne({ orderId });
    if (!incompletePayment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Incomplete payment record not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: incompletePayment 
    });
  } catch (error) {
    console.error('Error fetching incomplete payment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch incomplete payment',
      details: error.message 
    });
  }
});

// Webhook to verify payment
router.post("/webhook", async (req, res) => {
  console.log('=== CASHFREE WEBHOOK RECEIVED ===');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const event = req.body;

    // Verify signature for security
    const receivedSignature = req.headers['x-webhook-signature'];
    if (receivedSignature) {
      const expectedSignature = crypto
        .createHmac('sha256', CASHFREE_SECRET_KEY)
        .update(JSON.stringify(event))
        .digest('base64');
      
      console.log('Signature verification:', {
        received: receivedSignature,
        expected: expectedSignature,
        match: receivedSignature === expectedSignature
      });
      
      if (receivedSignature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(400).send('Invalid signature');
      }
    } else {
      console.warn('No webhook signature provided');
    }

    // Process payment event
    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const paymentData = event.data;
      const orderId = paymentData.order?.order_id;
      const paymentId = paymentData.payment?.cf_payment_id;
      const orderAmount = paymentData.order?.order_amount;
      const paymentStatus = paymentData.payment?.payment_status;
      
      console.log(`Processing payment: ${paymentId}, Order: ${orderId}, Status: ${paymentStatus}`);
      
      if (paymentStatus === 'SUCCESS') {
        await processSuccessfulPayment({
          orderId,
          paymentId,
          orderAmount,
          paymentData
        });
        console.log('✅ Payment processed successfully');
      } else {
        // Save incomplete payment for admin review
        await saveIncompletePayment({
          orderId: orderId,
          transactionId: paymentId,
          amount: orderAmount,
          customerDetails: {
            customerId: paymentData.customer_details?.customer_id,
            customerName: paymentData.customer_details?.customer_name,
            customerEmail: paymentData.customer_details?.customer_email,
            customerPhone: paymentData.customer_details?.customer_phone
          },
          userId: paymentData.customer_details?.customer_id, // Use customer ID as user ID
          paymentMethod: paymentData.payment?.payment_method,
          paymentStatusFromGateway: paymentStatus,
          orderStatusFromGateway: paymentData.order?.order_status,
          gatewayResponse: event
        });
        
        await processFailedPayment({
          orderId,
          paymentId,
          paymentStatus,
          paymentData
        });
        console.log('❌ Payment failed, recorded in database');
      }
    } else {
      console.log('Webhook event type:', event.type, '- No action needed');
    }

    res.status(200).json({ message: "Webhook received successfully", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: "Webhook processing failed", details: error.message });
  }
});

// Endpoint to retry payment verification for pending orders
router.post("/retry-payment/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Validate order ID
    if (!orderId || orderId.includes('{') || orderId.includes('}') || 
        orderId.includes('KTAqpwFjFCDenUW6j_Yo1xEJv9-Y5Ng_42YTJk9YQt4N0EW7yy3nOgEpayment')) {
      return res.status(400).json({ 
        error: 'Invalid order ID',
        message: 'Order ID contains invalid characters'
      });
    }
    
    console.log(`Retrying payment verification for order: ${orderId}`);
    
    // Check Cashfree API for payment status
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/${orderId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
      }
    );
    
    const orderData = response.data;
    console.log('Retry order status from Cashfree:', JSON.stringify(orderData, null, 2));
    
    // Handle the specific case where order is PAID but payment status is NOT_ATTEMPTED
    if (orderData.order_status === 'PAID' && orderData.payment_status === 'NOT_ATTEMPTED') {
      console.log('Retry: Handling PAID order with NOT_ATTEMPTED payment status');
      
      // Save this incomplete payment for admin review if not already saved
      await saveIncompletePayment({
        orderId: orderData.order_id,
        transactionId: orderData.cf_order_id,
        amount: orderData.order_amount,
        customerDetails: {
          customerId: orderData.customer_details?.customer_id,
          customerName: orderData.customer_details?.customer_name,
          customerEmail: orderData.customer_details?.customer_email,
          customerPhone: orderData.customer_details?.customer_phone
        },
        paymentMethod: orderData.payment_method,
        paymentStatusFromGateway: orderData.payment_status,
        orderStatusFromGateway: orderData.order_status,
        gatewayResponse: orderData
      });
      
      // Check if there's any payment data that indicates success
      if (orderData.payments && orderData.payments.length > 0) {
        const latestPayment = orderData.payments[0]; // Assuming first payment is the latest
        console.log('Retry: Found payment data:', JSON.stringify(latestPayment, null, 2));
        
        if (latestPayment.status === 'SUCCESS') {
          console.log('Retry: Payment data shows SUCCESS, processing based on payment data');
          
          // Check if already processed
          const existingTransaction = await Transaction.findOne({ orderno: orderId });
          if (existingTransaction && existingTransaction.status === 'TXN_SUCCESS') {
            console.log(`Retry: Order ${orderId} already processed successfully`);
            // Mark the incomplete payment as resolved
            await IncompletePayment.updateOne(
              { orderId: orderData.order_id },
              { 
                resolved: true,
                resolutionNotes: 'Payment already processed successfully'
              }
            );
            return res.json({ 
              success: true, 
              message: 'Payment already processed successfully',
              orderStatus: 'PAID',
              paymentStatus: 'SUCCESS',
              alreadyProcessed: true
            });
          }
          
          // Process based on payment data even if overall status is NOT_ATTEMPTED
          const webhookData = {
            type: 'PAYMENT_SUCCESS_WEBHOOK',
            data: {
              order: orderData,
              payment: {
                cf_payment_id: latestPayment.cf_payment_id,
                payment_status: 'SUCCESS',
                payment_method: latestPayment.payment_method || 'UPI'
              },
              customer_details: orderData.customer_details
            }
          };
          
          await processSuccessfulPayment({
            orderId: orderData.order_id,
            paymentId: latestPayment.cf_payment_id,
            orderAmount: orderData.order_amount,
            paymentData: webhookData.data
          });
          
          // Mark the incomplete payment as resolved
          await IncompletePayment.updateOne(
            { orderId: orderData.order_id },
            { 
              resolved: true,
              resolutionNotes: 'Payment processed based on payment data'
            }
          );
          
          res.json({ 
            success: true, 
            message: 'Payment verified and processed successfully',
            orderStatus: orderData.order_status,
            paymentStatus: latestPayment.status
          });
        } else {
          // Payment not completed
          console.log('Retry: Payment data does not show SUCCESS');
          res.json({ 
            success: false, 
            message: 'Payment not completed',
            orderStatus: orderData.order_status,
            paymentStatus: latestPayment.status || 'NOT_ATTEMPTED'
          });
        }
      } else {
        // No payment data, still not completed
        console.log('Retry: No payment data found');
        res.json({ 
          success: false, 
          message: 'Payment not completed',
          orderStatus: orderData.order_status,
          paymentStatus: orderData.payment_status
        });
      }
    }
    // Check if payment was actually completed
    else if (orderData.order_status === 'PAID' && orderData.payment_status === 'SUCCESS') {
      console.log('Retry: Order and payment both show SUCCESS, processing...');
      
      // Check if already processed
      const existingTransaction = await Transaction.findOne({ orderno: orderId });
      if (existingTransaction && existingTransaction.status === 'TXN_SUCCESS') {
        console.log(`Retry: Order ${orderId} already processed successfully`);
        return res.json({ 
          success: true, 
          message: 'Payment already processed successfully',
          orderStatus: 'PAID',
          paymentStatus: 'SUCCESS',
          alreadyProcessed: true
        });
      }
      
      // Process successful payment
      const webhookData = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: orderData,
          payment: {
            cf_payment_id: orderData.cf_order_id,
            payment_status: 'SUCCESS',
            payment_method: orderData.payment_method || 'UPI'
          },
          customer_details: orderData.customer_details
        }
      };
      
      await processSuccessfulPayment({
        orderId: orderData.order_id,
        paymentId: orderData.cf_order_id,
        orderAmount: orderData.order_amount,
        paymentData: webhookData.data
      });
      
      res.json({ 
        success: true, 
        message: 'Payment verified and processed successfully',
        orderStatus: orderData.order_status,
        paymentStatus: orderData.payment_status
      });
    } else if (orderData.order_status === 'PAID') {
      // Order is marked as PAID in Cashfree - trust this status and process payment successfully
      console.log('Retry: Order status is PAID in Cashfree, processing payment successfully...');
      
      // Check if there's any payment data to use
      let paymentId = orderData.cf_order_id;
      let paymentMethod = orderData.payment_method || 'UPI';
      
      // If there are payments array, use the first successful payment or just the first payment
      if (orderData.payments && orderData.payments.length > 0) {
        const successfulPayment = orderData.payments.find(p => p.status === 'SUCCESS');
        const paymentToUse = successfulPayment || orderData.payments[0];
        paymentId = paymentToUse.cf_payment_id;
        paymentMethod = paymentToUse.payment_method || paymentMethod;
        console.log('Retry: Using payment data:', JSON.stringify(paymentToUse, null, 2));
      }
      
      // Check if already processed
      const existingTransaction = await Transaction.findOne({ orderno: orderId });
      if (existingTransaction && existingTransaction.status === 'TXN_SUCCESS') {
        console.log(`Retry: Order ${orderId} already processed successfully`);
        return res.json({ 
          success: true, 
          message: 'Payment already processed successfully',
          orderStatus: 'PAID',
          paymentStatus: 'SUCCESS',
          alreadyProcessed: true
        });
      }
      
      // Process successful payment
      const webhookData = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: orderData,
          payment: {
            cf_payment_id: paymentId,
            payment_status: 'SUCCESS',
            payment_method: paymentMethod
          },
          customer_details: orderData.customer_details
        }
      };
      
      await processSuccessfulPayment({
        orderId: orderData.order_id,
        paymentId: paymentId,
        orderAmount: orderData.order_amount,
        paymentData: webhookData.data
      });
      
      res.json({ 
        success: true, 
        message: 'Payment verified and processed successfully',
        orderStatus: orderData.order_status,
        paymentStatus: 'SUCCESS'
      });
    } else {
      // Payment not completed
      console.log('Retry: Payment not completed, order status:', orderData.order_status, 'payment status:', orderData.payment_status);
      res.json({ 
        success: false, 
        message: 'Payment not completed',
        orderStatus: orderData.order_status || 'NOT_CREATED',
        paymentStatus: orderData.payment_status || 'NOT_ATTEMPTED'
      });
    }
  } catch (error) {
    console.error('Payment retry error:', error.response?.data || error.message);
    
    // If it's a malformed order ID, return a proper error response
    if (error.message && (error.message.includes('Invalid order ID') || 
        req.params.orderId.includes('{') || req.params.orderId.includes('}') ||
        req.params.orderId.includes('KTAqpwFjFCDenUW6j_Yo1xEJv9-Y5Ng_42YTJk9YQt4N0EW7yy3nOgEpayment'))) {
      return res.status(400).json({ 
        error: 'Invalid order ID',
        message: 'Order ID contains invalid characters'
      });
    }
    
    res.status(500).json({ 
      error: 'Payment retry failed', 
      details: error.response?.data || error.message 
    });
  }
});

// Helper function to save incomplete payments
async function saveIncompletePayment(paymentData) {
  try {
    const {
      orderId,
      transactionId,
      amount,
      customerDetails,
      paymentMethod,
      paymentStatusFromGateway,
      orderStatusFromGateway,
      gatewayResponse,
      userId // Add userId parameter
    } = paymentData;

    // Check if this incomplete payment already exists
    const existingRecord = await IncompletePayment.findOne({ orderId });
    if (existingRecord) {
      console.log(`Incomplete payment record already exists for order: ${orderId}`);
      return existingRecord;
    }

    // Create new incomplete payment record
    const incompletePayment = new IncompletePayment({
      orderId,
      transactionId,
      amount,
      customerDetails,
      userId, // Add userId to the record
      paymentMethod,
      paymentStatusFromGateway,
      orderStatusFromGateway,
      gatewayResponse
    });

    const savedRecord = await incompletePayment.save();
    console.log(`Saved incomplete payment record for order: ${orderId}`);
    return savedRecord;
  } catch (error) {
    console.error('Error saving incomplete payment record:', error);
    // Don't throw error as this is a secondary operation
  }
}

// Helper function to process successful payment
async function processSuccessfulPayment({ orderId, paymentId, orderAmount, paymentData }) {
  try {
    // Extract customer phone from payment data to find user
    const customerPhone = paymentData.customer_details?.customer_phone;
    
    if (!customerPhone) {
      throw new Error('Customer phone not found in payment data');
    }

    // Find user profile by mobile number
    const userProfile = await Profile.findOne({ mobile_no: customerPhone });
    if (!userProfile) {
      throw new Error(`User profile not found for phone: ${customerPhone}`);
    }

    // Find user account
    const userAccount = await UserModel.findOne({ ref_no: userProfile.registration_no });
    if (!userAccount) {
      throw new Error(`User account not found for registration: ${userProfile.registration_no}`);
    }

    // Extract order metadata
    let orderTags = {};
    try {
      // Try to get metadata from order_tags (object with string values)
      if (paymentData.order?.order_tags && typeof paymentData.order.order_tags === 'object') {
        orderTags = paymentData.order.order_tags;
      } else if (paymentData.order?.order_note) {
        // Fallback to order_note with proper HTML entity decoding
        let orderNote = paymentData.order.order_note;
        // Decode HTML entities if present
        orderNote = orderNote.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        orderTags = JSON.parse(orderNote);
      }
    } catch (error) {
      console.warn('Failed to parse order metadata:', error.message);
      console.warn('Order note content:', paymentData.order?.order_note);
      orderTags = {};
    }
    const planType = orderTags.planType || 'silver';
    const promocode = orderTags.promocode;
    const originalAmount = orderTags.originalAmount || orderAmount;
    
    // Determine user type and subscription duration
    let userType, monthsToAdd, paidUserType;
    if (planType === 'premium') {
      userType = 'PremiumUser';
      paidUserType = 'paidPremium';
      monthsToAdd = 12;
    } else {
      userType = 'SilverUser';
      paidUserType = 'paidSilver';
      monthsToAdd = 6;
    }

    // Calculate new expiry date
    const currentDate = new Date();
    const expiryDate = new Date(currentDate);
    expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);

    // Create transaction record
    const transaction = new Transaction({
      registration_no: userProfile.registration_no,
      PG_id: paymentId,
      bank_ref_num: paymentData.payment?.bank_reference || '',
      mode: paymentData.payment?.payment_method || 'UPI',
      amount: orderAmount,
      status: 'TXN_SUCCESS',
      orderno: orderId,
      usertype: paidUserType,
      promocode: promocode,
      discount_applied: promocode ? (originalAmount - orderAmount) : 0,
      original_amount: originalAmount
    });

    await transaction.save();
    console.log(`Transaction saved with ID: ${transaction.transcation_id}`);

    // Update user profile
    await Profile.findOneAndUpdate(
      { registration_no: userProfile.registration_no },
      {
        expiry_date: expiryDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
        status: 'active',
        type_of_user: userType
      }
    );

    // Update user account
    await UserModel.findOneAndUpdate(
      { ref_no: userProfile.registration_no },
      {
        status: 'active',
        user_role: userType
      }
    );

    console.log(`User ${userProfile.registration_no} upgraded to ${userType}`);

    // Handle promoter earnings if promocode was used
    if (promocode) {
      await createPromoterEarning({
        promocode: promocode,
        userRegistrationNo: userProfile.registration_no,
        userEmail: userProfile.email_id,
        userMobile: userProfile.mobile_no,
        transactionNo: paymentId,
        userType: paidUserType
      });
    }

  } catch (error) {
    console.error('Error processing successful payment:', error);
    throw error;
  }
}

// Helper function to process failed payment
async function processFailedPayment({ orderId, paymentId, paymentStatus, paymentData }) {
  try {
    const customerPhone = paymentData.customer_details?.customer_phone;
    
    if (customerPhone) {
      const userProfile = await Profile.findOne({ mobile_no: customerPhone });
      
      if (userProfile) {
        // Create failed transaction record
        const transaction = new Transaction({
          registration_no: userProfile.registration_no,
          PG_id: paymentId,
          amount: paymentData.order?.order_amount || 0,
          status: 'TXN_FAILURE',
          orderno: orderId,
          usertype: 'paidSilver', // Default for failed transactions
          original_amount: paymentData.order?.order_amount || 0
        });

        await transaction.save();
        console.log(`Failed transaction saved for order: ${orderId}`);
      }
    }
  } catch (error) {
    console.error('Error processing failed payment:', error);
  }
}

// Helper function to create promoter earning record
async function createPromoterEarning({ promocode, userRegistrationNo, userEmail, userMobile, transactionNo, userType }) {
  try {
    const earning = new PromotersEarningsModel({
      referal_by: promocode,
      ref_no: userRegistrationNo,
      emailid: userEmail,
      mobile: userMobile,
      amount_earned: '100', // Fixed ₹100 for promocode
      transaction_no: transactionNo,
      status: 'pending',
      usertype: userType
    });

    await earning.save();
    console.log(`Promoter earning created with ID: ${earning.id} for promocode: ${promocode}`);
  } catch (error) {
    console.error('Error creating promoter earning:', error);
  }
}


// Handle payment redirect from Cashfree
router.get("/payment-redirect", async (req, res) => {
  try {
    const { order_id, order_token } = req.query;
    
    if (!order_id) {
      return res.status(400).json({ 
        error: 'Missing order ID',
        message: 'Order ID is required for payment verification'
      });
    }
    
    console.log(`Payment redirect received for order: ${order_id}`);
    
    // Check if payment was successful by calling Cashfree API
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/${order_id}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
      }
    );
    
    const orderData = response.data;
    console.log('Redirect verification - Order status from Cashfree:', JSON.stringify(orderData, null, 2));
    
    // Check if already processed
    const existingTransaction = await Transaction.findOne({ orderno: order_id });
    if (existingTransaction && existingTransaction.status === 'TXN_SUCCESS') {
      console.log(`Order ${order_id} already processed successfully`);
      return res.json({ 
        success: true, 
        message: 'Payment already processed successfully',
        orderStatus: 'PAID',
        paymentStatus: 'SUCCESS',
        alreadyProcessed: true
      });
    }
    
    // Handle different payment states
    if (orderData.order_status === 'PAID' && orderData.payment_status === 'SUCCESS') {
      // Payment successful
      const webhookData = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: orderData,
          payment: {
            cf_payment_id: orderData.cf_order_id,
            payment_status: 'SUCCESS',
            payment_method: orderData.payment_method || 'UPI'
          },
          customer_details: orderData.customer_details
        }
      };
      
      await processSuccessfulPayment({
        orderId: orderData.order_id,
        paymentId: orderData.cf_order_id,
        orderAmount: orderData.order_amount,
        paymentData: webhookData.data
      });
      
      res.json({ 
        success: true, 
        message: 'Payment verified and processed successfully',
        orderStatus: orderData.order_status,
        paymentStatus: orderData.payment_status,
        redirectUrl: `${process.env.FRONTEND_URL}/user/userDashboard?payment=success&order_id=${order_id}`
      });
      
    } else if (orderData.order_status === 'PAID' && 
               (orderData.payment_status === 'PENDING' || orderData.payment_status === 'NOT_ATTEMPTED')) {
      // Payment might be in progress, save as incomplete and return pending status
      await saveIncompletePayment({
        orderId: orderData.order_id,
        transactionId: orderData.cf_order_id,
        amount: orderData.order_amount,
        customerDetails: {
          customerId: orderData.customer_details?.customer_id,
          customerName: orderData.customer_details?.customer_name,
          customerEmail: orderData.customer_details?.customer_email,
          customerPhone: orderData.customer_details?.customer_phone
        },
        userId: orderData.customer_details?.customer_id,
        paymentMethod: orderData.payment_method,
        paymentStatusFromGateway: orderData.payment_status,
        orderStatusFromGateway: orderData.order_status,
        gatewayResponse: orderData
      });
      
      res.json({ 
        success: false, 
        message: 'Payment is still being processed',
        orderStatus: orderData.order_status,
        paymentStatus: orderData.payment_status,
        redirectUrl: `${process.env.FRONTEND_URL}/user/userDashboard?payment=pending&order_id=${order_id}`
      });
      
    } else {
      // Payment failed or not completed
      res.json({ 
        success: false, 
        message: 'Payment was not completed successfully',
        orderStatus: orderData.order_status || 'NOT_CREATED',
        paymentStatus: orderData.payment_status || 'NOT_ATTEMPTED',
        redirectUrl: `${process.env.FRONTEND_URL}/user/userDashboard?payment=failed&order_id=${order_id}`
      });
    }
    
  } catch (error) {
    console.error('Payment redirect verification error:', error.response?.data || error.message);
    
    res.status(500).json({ 
      error: 'Payment verification failed', 
      details: error.response?.data || error.message,
      redirectUrl: `${process.env.FRONTEND_URL}/user/userDashboard?payment=error`
    });
  }
});

// Enhanced payment status check with retry logic
router.get("/payment-status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || orderId.includes('{') || orderId.includes('}')) {
      return res.status(400).json({ 
        error: 'Invalid order ID',
        message: 'Order ID contains invalid characters'
      });
    }
    
    console.log(`Checking payment status for order: ${orderId}`);
    
    // Check if already processed
    const existingTransaction = await Transaction.findOne({ orderno: orderId });
    if (existingTransaction) {
      return res.json({ 
        success: true,
        orderStatus: existingTransaction.status === 'TXN_SUCCESS' ? 'PAID' : 'FAILED',
        paymentStatus: existingTransaction.status === 'TXN_SUCCESS' ? 'SUCCESS' : 'FAILED',
        transactionId: existingTransaction.PG_id,
        amount: existingTransaction.amount,
        alreadyProcessed: true
      });
    }
    
    // Check Cashfree API
    const response = await axios.get(
      `${CASHFREE_BASE_URL}/${orderId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
      }
    );
    
    const orderData = response.data;
    console.log('Status check - Order data from Cashfree:', JSON.stringify(orderData, null, 2));
    
    // Handle different scenarios
    if (orderData.order_status === 'PAID' && orderData.payment_status === 'SUCCESS') {
      // Process the successful payment
      const webhookData = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: orderData,
          payment: {
            cf_payment_id: orderData.cf_order_id,
            payment_status: 'SUCCESS',
            payment_method: orderData.payment_method || 'UPI'
          },
          customer_details: orderData.customer_details
        }
      };
      
      await processSuccessfulPayment({
        orderId: orderData.order_id,
        paymentId: orderData.cf_order_id,
        orderAmount: orderData.order_amount,
        paymentData: webhookData.data
      });
      
      res.json({ 
        success: true,
        orderStatus: 'PAID',
        paymentStatus: 'SUCCESS',
        transactionId: orderData.cf_order_id,
        amount: orderData.order_amount,
        message: 'Payment processed successfully'
      });
      
    } else if (orderData.order_status === 'PAID' && 
               (orderData.payment_status === 'PENDING' || orderData.payment_status === 'NOT_ATTEMPTED')) {
      // Check if there are any successful payments in the payments array
      if (orderData.payments && orderData.payments.length > 0) {
        const successfulPayment = orderData.payments.find(p => p.status === 'SUCCESS');
        
        if (successfulPayment) {
          console.log('Found successful payment in payments array, processing...');
          
          const webhookData = {
            type: 'PAYMENT_SUCCESS_WEBHOOK',
            data: {
              order: orderData,
              payment: {
                cf_payment_id: successfulPayment.cf_payment_id,
                payment_status: 'SUCCESS',
                payment_method: successfulPayment.payment_method || 'UPI'
              },
              customer_details: orderData.customer_details
            }
          };
          
          await processSuccessfulPayment({
            orderId: orderData.order_id,
            paymentId: successfulPayment.cf_payment_id,
            orderAmount: orderData.order_amount,
            paymentData: webhookData.data
          });
          
          res.json({ 
            success: true,
            orderStatus: 'PAID',
            paymentStatus: 'SUCCESS',
            transactionId: successfulPayment.cf_payment_id,
            amount: orderData.order_amount,
            message: 'Payment processed successfully based on payment data'
          });
          
          return;
        }
      }
      
      // Save as incomplete payment
      await saveIncompletePayment({
        orderId: orderData.order_id,
        transactionId: orderData.cf_order_id,
        amount: orderData.order_amount,
        customerDetails: {
          customerId: orderData.customer_details?.customer_id,
          customerName: orderData.customer_details?.customer_name,
          customerEmail: orderData.customer_details?.customer_email,
          customerPhone: orderData.customer_details?.customer_phone
        },
        userId: orderData.customer_details?.customer_id,
        paymentMethod: orderData.payment_method,
        paymentStatusFromGateway: orderData.payment_status,
        orderStatusFromGateway: orderData.order_status,
        gatewayResponse: orderData
      });
      
      res.json({ 
        success: false,
        orderStatus: 'PAID',
        paymentStatus: orderData.payment_status,
        amount: orderData.order_amount,
        message: 'Payment is still being processed'
      });
      
    } else {
      res.json({ 
        success: false,
        orderStatus: orderData.order_status || 'NOT_CREATED',
        paymentStatus: orderData.payment_status || 'NOT_ATTEMPTED',
        amount: orderData.order_amount || 0,
        message: 'Payment was not completed successfully'
      });
    }
    
  } catch (error) {
    console.error('Payment status check error:', error.response?.data || error.message);
    
    res.status(500).json({ 
      error: 'Payment status check failed', 
      details: error.response?.data || error.message
    });
  }
});

// Raise ticket for incomplete payment with image upload
router.post("/incomplete-payment/raise-ticket/:orderId", upload.array('images', 5), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { description } = req.body;
    const uploadedImages = [];

    console.log(`Raising ticket for order: ${orderId}`);
    console.log(`Description: ${description}`);
    console.log(`Files received: ${req.files ? req.files.length : 0}`);

    // Validate required fields
    if (!description || !description.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: "Description is required" 
      });
    }

    // Find the incomplete payment
    const incompletePayment = await IncompletePayment.findOne({ orderId });
    if (!incompletePayment) {
      return res.status(404).json({ 
        success: false, 
        error: "Incomplete payment not found" 
      });
    }

    // Process uploaded images
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} images...`);
      
      for (const file of req.files) {
        try {
          // Upload to ImageKit
          const ImageKit = require('imagekit');
          const imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
          });

          const uploadResponse = await imagekit.upload({
            file: file.buffer,
            fileName: `ticket_${orderId}_${Date.now()}_${file.originalname}`,
            folder: `/incomplete-payment-tickets/${orderId}`,
          });

          uploadedImages.push({
            url: uploadResponse.url,
            fileId: uploadResponse.fileId,
            name: file.originalname,
            size: file.size
          });

          console.log(`Image uploaded successfully: ${uploadResponse.url}`);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Continue with other images even if one fails
        }
      }
    }

    // Update the incomplete payment with ticket information
    incompletePayment.userTicket = {
      description: description.trim(),
      images: uploadedImages,
      ticketRaised: true,
      ticketRaisedAt: new Date()
    };

    incompletePayment.ticketRaised = true;
    incompletePayment.ticketRaisedAt = new Date();

    await incompletePayment.save();

    console.log(`Ticket raised successfully for order: ${orderId}`);

    res.json({
      success: true,
      message: "Ticket raised successfully",
      data: {
        orderId: incompletePayment.orderId,
        description: incompletePayment.userTicket.description,
        images: incompletePayment.userTicket.images,
        ticketRaisedAt: incompletePayment.ticketRaisedAt
      }
    });

  } catch (error) {
    console.error('Error raising ticket:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to raise ticket",
      message: error.message 
    });
  }
});

module.exports = router;