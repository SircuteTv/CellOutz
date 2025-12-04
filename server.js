import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

app.use(express.json());
app.use(cors());

// Work out current directory (needed in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve your static files if needed (not strictly required for Stripe)
app.use(express.static(__dirname));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, quantity } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: quantity
        }
      ],
      success_url: "https://celloutz.onrender.com/prints.html?status=success",
      cancel_url: "https://celloutz.onrender.com/prints.html?status=cancel"
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Use Render's port in production
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
