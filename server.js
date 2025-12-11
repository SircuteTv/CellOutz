// server.js — Stable Working Stripe Backend (with shipping support)

import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve your static site (HTML, images, CSS, JS)
app.use(express.static(__dirname));

// Stripe setup
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("❌ STRIPE_SECRET_KEY missing! Add it in Render > Environment.");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20",
});

// ======================================================
// CREATE CHECKOUT SESSION
// ======================================================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = req.body.items || [];
    const shippingCost = Number(req.body.shippingCost || 0);

    // Convert items to Stripe line_items
    const lineItems = items
      .filter(i => i && i.priceId && i.quantity > 0)
      .map(i => ({
        price: i.priceId,
        quantity: i.quantity,
      }));

    if (!lineItems.length) {
      return res.status(400).json({ error: "Cart is empty or invalid." });
    }

    // Add shipping as its own Stripe product
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "aud",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: "https://celloutz-backend.onrender.com/success.html",
      cancel_url: "https://celloutz-backend.onrender.com/prints.html",

      // Let buyer enter address
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["AU", "US", "GB", "NZ", "CA", "FR", "DE", "ES"],
      },
    });

    console.log("✅ Checkout session:", session.id);

    return res.json({ url: session.url });

  } catch (err) {
    console.error("❌ Stripe Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 CellOutz backend running on port ${PORT}`)
);
