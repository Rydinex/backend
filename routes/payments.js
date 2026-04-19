const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/intent', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'usd', rideId } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { rideId, userId: req.user.userId },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm payment
router.post('/confirm', authenticate, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // TODO: Update ride payment status
      res.json({ status: 'success', paymentId: paymentIntentId });
    } else {
      res.status(400).json({ error: 'Payment failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    // TODO: Fetch from database
    res.json({
      payments: [
        { id: 'pay-1', amount: 25.50, status: 'succeeded', date: '2026-04-15' },
        { id: 'pay-2', amount: 18.75, status: 'succeeded', date: '2026-04-14' },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
