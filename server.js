// server.js  (no CORS, clean Stripe checkout)

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import cors from 'cors';

dotenv.config();

const app = express();

// ---- paths for static files ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Stripe ----
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ---- middleware ----
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves your .html, images, etc.

// ---- THIS IS THE IMPORTANT PART ----
app.post('/create-checkout-session', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    // Convert front-end items -> Stripe line_items
    const line_items = items
      .filter(it => it.priceId && it.quantity > 0)
      .map(it => ({
        // Stripe wants `price`, not `priceId`
        price: it.priceId,
        quantity: it.quantity
      }));

    if (!line_items.length) {
      console.error('No valid line items from client:', items);
      return res.status(400).json({ error: 'No valid items to charge' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: 'https://celloutz-backend.onrender.com/success.html',
      cancel_url: 'https://celloutz-backend.onrender.com/prints.html'
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res
      .status(500)
      .json({ error: err.message || 'Stripe error creating session' });
  }
});

// ---- start server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
