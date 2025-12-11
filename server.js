// server.js  (no CORS, clean Stripe checkout)

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Stripe ----
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set in the environment!');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20', // or whatever Stripe suggests in your dashboard
});

// Parse JSON bodies
app.use(express.json());

// Serve your static files (prints.html, images, etc.) from this folder
app.use(express.static(__dirname));

// ---- Checkout route ----
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body || {};
    console.log('🧾 Incoming items from client:', items);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    // Map each cart item into a Stripe line item
    const line_items = items.map((item) => ({
      price: item.stripePriceId,        // must be like "price_123..."
      quantity: item.qty || 1,
    }));

    console.log('📦 Stripe line_items:', line_items);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${req.protocol}://${req.get('host')}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${req.protocol}://${req.get('host')}/prints.html`,
    });

    console.log('✅ Created checkout session:', session.id);

    return res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe checkout error:', err);
    return res.status(500).json({
      error: err?.message || 'Internal server error',
    });
  }
});

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`🚀 CellOutz server listening on port ${PORT}`);
});
