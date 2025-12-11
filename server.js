import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(cors());

// Serve your static files (prints.html, images, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

// IMPORTANT: env var name must be STRIPE_SECRET_KEY on Render
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in cart." });
    }

    // Use stripePriceId + qty from the front-end CART
    const line_items = items
      .filter(i => i.stripePriceId)
      .map(i => ({
        price: i.stripePriceId,
        quantity: i.qty || i.quantity || 1
      }));

    if (line_items.length === 0) {
      return res.status(400).json({ error: "No valid items to charge" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: "https://celloutz-backend.onrender.com/success.html",
      cancel_url: "https://celloutz-backend.onrender.com/prints.html"
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
