const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// ─── MIDDLEWARES ───
app.use(express.json());

// CORS Configuration: 
// localhost और भविष्य के Netlify URL के लिए परमिशन
const allowedOrigins = [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'https://your-netlify-site.netlify.app' // यहाँ बाद में अपना असली Netlify लिंक डाल देना
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// ─── DATABASE CONNECTION ───
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ VELOUR MongoDB Atlas Connected Successfully"))
  .catch(err => {
      console.error("❌ MongoDB Connection Error:", err.message);
      // प्रोडक्शन में सर्वर क्रैश न हो इसलिए इसे संभालना ज़रूरी है
  });

// ─── PRODUCT MODEL (Schema) ───
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true },
    category: { type: String },
    inStock: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

// ─── API ROUTES ───

// 1. Get All Products (यह चेक करने के लिए कि डेटाबेस चल रहा है)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: "Error fetching products", error: err.message });
    }
});

// 2. Add New Product (डेटा डालने के लिए)
app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(400).json({ message: "Error saving product", error: err.message });
    }
});

// 3. Stripe Checkout Route
app.post('/api/create-payment-intent', async (req, res) => {
    const { amount, currency } = req.body;
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), 
            currency: currency || 'usd',
            automatic_payment_methods: { enabled: true },
        });
        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. PayPal Configuration
app.get('/api/config/paypal', (req, res) => {
    res.send(process.env.PAYPAL_CLIENT_ID);
});

// 5. Root Route (यह चेक करने के लिए कि सर्वर लाइव है)
app.get('/', (req, res) => {
    res.status(200).send("VELOUR Premium API is Live and Running...");
});

// ─── SERVER START ───
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    🚀 VELOUR Backend Started Successfully
    📍 Port: ${PORT}
    🌐 Mode: ${process.env.NODE_ENV || 'development'}
    `);
});