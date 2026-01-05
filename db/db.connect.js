const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB; // your Atlas URI

const initializeDatabase = async () => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // faster fail if server is down
    });
    console.log("✅ Connected to Database");
  } catch (err) {
    console.error("❌ DB connection error:", err);
    process.exit(1); // stop app if DB is down
  }
};

module.exports = { initializeDatabase };
