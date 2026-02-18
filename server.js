const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// ─── MIDDLEWARES ───
app.use(express.json());

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000', // इसे जोड़ना बहुत ज़रूरी है
    'http://localhost:5173', 
    'https://your-netlify-site.netlify.app' 
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
  });

// ─── MODELS ───

// 1. Product Model
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

// 2. User Model
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false } 
});
const User = mongoose.model('User', UserSchema);

// 3. Order Model (नया)
const OrderSchema = new mongoose.Schema({
    userId: String,
    customerName: String,
    items: Array,
    totalAmount: Number,
    status: { type: String, default: 'Confirmed' },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);


// ─── AUTH ROUTES (Login/Register) ───

app.post('/api/auth/register', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ─── PRODUCT ROUTES ───

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (err) {
        res.status(500).json({ message: "Error fetching products", error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(400).json({ message: "Error saving product", error: err.message });
    }
});


// ─── ORDER ROUTES (नया) ───

app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (err) {
        res.status(400).json({ message: "Error placing order", error: err.message });
    }
});


// ─── PAYMENT ROUTES (Stripe & PayPal) ───

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

app.get('/api/config/paypal', (req, res) => {
    res.send(process.env.PAYPAL_CLIENT_ID);
});


// ─── ROOT ROUTE ───
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