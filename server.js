// server.js
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');

// Try both ENV names so you don't have to rename it in Render
const STRIPE_KEY =
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SECRET_KEY ||
  process.env.stripe_secret_key;

if (!STRIPE_KEY) {
  console.error('⚠️ No Stripe secret key found in ENV (STRIPE_SECRET or STRIPE_SECRET_KEY).');
}

const stripe = require('stripe')(STRIPE_KEY);


const app = express();

// Parse JSON bodies
app.use(express.json());

// Serve your static files (index.html, prints.html, images, etc.)
app.use(express.static(path.join(__dirname)));

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== Stripe Checkout route =====
app.post('/create-checkout-session', async (req, res) => {
  try {
    const items = req.body.items || [];
    console.log('🛒 /create-checkout-session called with items:', items);

    const realItems = items.filter(it => it.stripePriceId);
    if (realItems.length === 0) {
      console.warn('No purchasable items in cart');
      return res
        .status(400)
        .json({ error: 'No purchasable items in cart (missing stripePriceId).' });
    }

    const line_items = realItems.map(it => ({
      price: it.stripePriceId,
      quantity: it.qty || 1,
    }));

    console.log('Creating Stripe session with line_items:', line_items);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: 'https://celloutz-backend.onrender.com/success.html',
      cancel_url: 'https://celloutz-backend.onrender.com/prints.html',
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe error:', err);
    // Send the message back so we can see it in the browser for debugging
    res.status(500).json({
      error: err.message || 'Failed to create checkout session',
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
