// server.js — Full ESM backend for CellOutz

import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// ------------------------------------------------------
// Paths & Express setup
// ------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Host your HTML, images, JS, CSS
app.use(express.static(__dirname));

// ------------------------------------------------------
// Stripe setup
// ------------------------------------------------------
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("❌ ERROR: STRIPE_SECRET_KEY missing in Render environment!");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20",
});

// ------------------------------------------------------
// Checkout Session — now includes shippingCost
// Front-end sends:
// {
//   items: [ { priceId, quantity } ],
//   shippingCost: number  <-- from shipping dropdown
// }
// ------------------------------------------------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = req.body.items || [];
    const shippingCost = req.body.shippingCost || 0;

    // Validate items
    const lineItems = items
      .filter((it) => it && it.priceId && it.quantity > 0)
      .map((it) => ({
        price: it.priceId,
        quantity: it.quantity,
      }));

    if (!lineItems.length) {
      return res.status(400).json({
        error: "No valid items in cart (missing priceId or quantity).",
      });
    }

    // Add shipping as its own line item
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "aud",
          product_data: {
            name: "Shipping",
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: "https://celloutz-backend.onrender.com/success.html",
      cancel_url: "https://celloutz-backend.onrender.com/prints.html",

      // Show address form
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["AU", "US", "GB", "NZ", "CA", "FR", "DE", "ES"],
      },
    });

    console.log("✅ Checkout Session Created:", session.id);

    return res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe Error:", err);
    return res.status(500).json({
      error: err.message || "Unknown Stripe checkout error.",
    });
  }
});

// ------------------------------------------------------
// Start Server
// ------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CellOutz backend live on port ${PORT}`);
});
