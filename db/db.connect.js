const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGODB;

let isConnected = false;

const initializeDatabase = async () => {
  if (isConnected) {
    console.log("Already connected to DB");
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });

    isConnected = true;
    console.log("Connected to Database");
  } catch (err) {
    console.error("DB connection error:", err);

    throw err;
  }
};

module.exports = { initializeDatabase };
