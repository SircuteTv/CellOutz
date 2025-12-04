import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Figure out the current folder (needed for static files in ESM modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stripe client, using your env var
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

app.use(express.json());
app.use(cors());

// Serve your static site (index.html, prints.html, images, etc.)
app.use(express.static(__dirname));

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, quantity } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity
        }
      ],
      success_url: "https://celloutz.onrender.com/success.html",
      cancel_url: "https://celloutz.onrender.com/prints.html"
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANT for Render: use their PORT, or 3000 locally
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
