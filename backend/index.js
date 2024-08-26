require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const axios = require("axios"); // Required for fetching conversion rates

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error("Stripe environment variables are not set");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to handle raw body for Stripe webhook
app.use("/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors());

// Function to fetch conversion rate from USD to INR
const getConversionRate = async () => {
  try {
    const response = await axios.get("https://api.exchangerate-api.com/v4/latest/USD");
    return response.data.rates.INR;
  } catch (error) {
    console.error("Error fetching conversion rate:", error);
    throw new Error("Unable to fetch conversion rate");
  }
};

app.post("/pay", async (req, res) => {
  try {
    const { name, priceUSD } = req.body;
    if (!name || priceUSD == null) {
      
      return res.status(400).json({ message: priceUSD });
    }

    // Fetch the conversion rate
    const conversionRate = await getConversionRate();

    // Convert USD priceUSD to INR
    const amountINR = Math.round(priceUSD * conversionRate * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountINR,
      currency: "INR",
      payment_method_types: ["card"],
      metadata: { name },
    });

    const clientSecret = paymentIntent.client_secret;
    res.json({ message: "Payment initiated", clientSecret });
  } catch (err) {
    console.error("Error creating payment intent:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  switch (event.type) {
    case "payment_intent.created":
      console.log(`${event.data.object.metadata.name} initiated payment!`);
      break;
    case "payment_intent.succeeded":
      console.log(`${event.data.object.metadata.name} succeeded payment!`);
      // Fulfillment logic here
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
