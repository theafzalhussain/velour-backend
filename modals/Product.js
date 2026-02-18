const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String, // Cloudinary URL
  category: String,
  description: String
});

module.exports = mongoose.model('Product', productSchema);