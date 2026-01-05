// db.connect.js
const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB;

let isConnected = false; // track if DB is already connected

const initializeDatabase = async () => {
  if (isConnected) {
    // Already connected, reuse
    console.log("✅ Already connected to DB");
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30s is safer for free tier
    });

    isConnected = true;
    console.log("✅ Connected to Database");
  } catch (err) {
    console.error("❌ DB connection error:", err);
    // Don't exit Vercel serverless function; just throw
    throw err;
  }
};

module.exports = { initializeDatabase };
