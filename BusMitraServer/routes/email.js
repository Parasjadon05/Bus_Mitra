const express = require('express');
const Joi = require('joi');
const emailService = require('../services/emailService');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const sendCredentialsSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required'
  }),
  driverId: Joi.string().min(3).max(20).required().messages({
    'string.min': 'Driver ID must be at least 3 characters long',
    'string.max': 'Driver ID must not exceed 20 characters',
    'any.required': 'Driver ID is required'
  }),
  password: Joi.string().min(6).max(50).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 50 characters',
    'any.required': 'Password is required'
  })
});

// Send driver credentials
router.post('/send-driver-credentials', validateRequest(sendCredentialsSchema), async (req, res) => {
  try {
    const { email, name, driverId, password } = req.body;

    console.log(`Sending credentials to ${email} for driver ${name}`);

    const result = await emailService.sendDriverCredentials({
      email,
      name,
      driverId,
      password
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Driver credentials sent successfully',
        data: {
          email,
          driverId,
          messageId: result.messageId
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send driver credentials',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in send-driver-credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test email service connection
router.get('/test', async (req, res) => {
  try {
    const result = await emailService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email service is working correctly'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Email service connection failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error testing email service:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send test email (for development)
router.post('/test-email', validateRequest(sendCredentialsSchema), async (req, res) => {
  try {
    const { email, name, driverId, password } = req.body;

    console.log(`Sending test email to ${email}`);

    const result = await emailService.sendDriverCredentials({
      email,
      name: `[TEST] ${name}`,
      driverId: `TEST-${driverId}`,
      password
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          email,
          messageId: result.messageId
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in test-email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
