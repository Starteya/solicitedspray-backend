// backend/routes/contact.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
// Import nodemailer for sending emails
const nodemailer = require('nodemailer');
// Import rate limiter
const rateLimit = require('express-rate-limit');
const axios = require('axios');

// Define rate limiter to prevent spam submissions
const contactLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 2, // Limit each IP to 1 requests per windowMs
  message: 'Too many contact requests from this IP, please try again later.'
});


// POST /api/contact
router.post(
  '/',
  contactLimiter,
  [
    // Form validation and sanitization
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({max: 25}).withMessage('Name cannot be longer than 25 characters')
      .escape(),
    body('email')
      .optional({ checkFalsy: true })
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    body('comments')
      .trim()
      .notEmpty().withMessage('Comments are required')
        .isLength({ max: 500 }).withMessage('Comments cannot be longer than 500 characters')
      .escape(),
      body('captchaToken')
  .notEmpty().withMessage('Captcha token is required'),
  ],
  async (req, res) => {
    // Validate and sanitize inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return validation errors to the frontend
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, comments, captchaToken } = req.body;

       try {
              const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';

        const params = new URLSearchParams();
        params.append('secret', process.env.RECAPTCHA_SECRET_KEY);
        params.append('response', captchaToken);
        params.append('remoteip', req.ip); // user's ip

      const captchaResponse = await axios.post(verificationURL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

      if (!captchaResponse.data.success) {
        console.error('Captcha verification failed:', captchaResponse.data['error-codes']);
        return res.status(400).json({ errors: [{ msg: 'Captcha verification failed' }] });
      }
    } catch (error) {
      console.error('Error verifying captcha:', error);
      return res.status(500).json({ error: 'An error occurred during captcha verification. Please try again later.' });
    }
      
    try {
      // Create a transporter for sending emails
      const transporter = nodemailer.createTransport({
          service: 'gmail', // Use Gmail
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      // Prepare the email content
      const mailOptions = {
        from: process.env.EMAIL_USERNAME, // Sender address
        to: process.env.CONTACT_EMAIL,    // Your email address to receive the contact messages
        subject: 'New Contact Form Submission',
        text: `Name: ${name}\nEmail: ${email || 'Not provided'}\nComments:\n${comments}`,
      };

      // Send the email
      await transporter.sendMail(mailOptions);

      // Send a success response
      res.json({ message: 'Your message has been sent successfully.' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'An error occurred while sending your message. Please try again later.' });
    }
  }
);

module.exports = router;