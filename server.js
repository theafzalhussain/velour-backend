const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const app = express();

// ─── MIDDLEWARES ───
app.use(express.json());

// CORS Configuration: अपनी Netlify URL यहाँ डालें
const allowedOrigins = ['http://localhost:3000', 'https://your-netlify-site.netlify.app'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// ─── DATABASE CONNECTION (MongoDB Atlas Cluster) ───
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ VELOUR Cluster Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ─── PRODUCT MODEL (Schema) ───
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true }, // Cloudinary URL यहाँ आएगा
    category: { type: String },
    inStock: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

// ─── API ROUTES ───

// 1. Get All Products (फ्रंट-एंड के लिए)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: "Error fetching products", error: err });
    }
});

// 2. Add New Product (Admin या Postman से डेटा डालने के लिए)
app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(400).json({ message: "Error saving product", error: err });
    }
});

// 3. Stripe Checkout Route
app.post('/api/create-payment-intent', async (req, res) => {
    const { amount, currency } = req.body;
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe cents में काम करता है
            currency: currency || 'usd',
            automatic_payment_methods: { enabled: true },
        });
        res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. PayPal Configuration (Client को ID भेजने के लिए)
app.get('/api/config/paypal', (req, res) => {
    res.send(process.env.PAYPAL_CLIENT_ID);
});

// 5. Root Route (Render Health Check के लिए)
app.get('/', (req, res) => {
    res.status(200).send("VELOUR Premium API is Live and Running...");
});

// ─── SERVER START ───
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    🚀 VELOUR Backend Started
    📍 Port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV || 'development'}
    `);
});