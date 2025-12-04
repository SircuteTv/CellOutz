require('dotenv').config();

const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();

// Try either STRIPE_SECRET or STRIPE_SECRET_KEY, since you mentioned both
const stripeSecret =
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.warn('⚠️ No STRIPE_SECRET or STRIPE_SECRET_KEY set in Render env');
}

const stripe = Stripe(stripeSecret);

const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Serve your HTML/CSS/JS/images from the project root
app.use(express.static(path.join(__dirname)));

// Create Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const items = req.body.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Map cart items -> Stripe line_items
    const lineItems = items
      .map(item => {
        if (!item.stripePriceId) return null;
        return {
          price: item.stripePriceId,
          quantity: item.qty || 1
        };
      })
      .filter(Boolean);

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No valid items to charge' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: 'https://celloutz-backend.onrender.com/success.html',
      cancel_url: 'https://celloutz-backend.onrender.com/prints.html'
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('⚠️ Error creating checkout session:', err);
    return res.status(500).json({ error: 'Server error creating checkout session' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
