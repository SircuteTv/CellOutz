// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// --- Basic setup ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Serve your static files (index.html, prints.html, images, etc.)
app.use(express.static(__dirname));

// IMPORTANT: this uses the env var you showed me in your screenshot:
// KEY = STRIPE_SECRET
const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: "2023-10-16"
});

// --- Create Checkout Session ----------------------------------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in cart" });
    }

    // Turn our cart items into Stripe line_items
    const line_items = items.map(item => {
      if (!item.stripePriceId) {
        throw new Error(`Missing Stripe price ID for ${item.title}`);
      }
      return {
        price: item.stripePriceId,
        quantity: item.qty || 1
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      // these pages can be simple HTML thank-you / error pages
      success_url: "https://celloutz.onrender.com/success.html",
      cancel_url: "https://celloutz.onrender.com/prints.html"
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message || "Stripe error" });
  }
});

// --- Start server ---------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
