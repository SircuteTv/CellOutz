// server.js - ESM backend for CellOutz
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables (STRIPE_SECRET_KEY etc.)
dotenv.config();

// ------------------------------------------------------
// Paths / basic Express setup
// ------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files (index.html, prints.html, images, etc.)
app.use(express.static(__dirname));

// ------------------------------------------------------
// Stripe setup
// ------------------------------------------------------
// IMPORTANT: in Render, set env var STRIPE_SECRET_KEY to your sk_live_… key
const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.error("❌ Missing STRIPE_SECRET_KEY env var");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-06-20"
});

// ------------------------------------------------------
// Create Checkout Session
// Front-end sends: { items: [ { priceId, quantity }, ... ] }
// ------------------------------------------------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    const lineItems = items
      .filter((it) => it && it.priceId && it.quantity > 0)
      .map((it) => ({
        price: it.priceId,
        quantity: it.quantity
      }));

    if (!lineItems.length) {
      return res
        .status(400)
        .json({ error: "No valid items to charge (missing priceId/quantity)." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      // Currency comes from the Price objects, but AUD is your intent anyway.
      success_url: "https://celloutz-backend.onrender.com/success.html",
      cancel_url: "https://celloutz-backend.onrender.com/prints.html",
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: ["AU"]
      }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Stripe error creating session." });
  }
});

// ------------------------------------------------------
// Start server
// ------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
