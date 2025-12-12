// const mongoose = require("mongoose");
// require("dotenv").config();

// const mongoUri = process.env.MONGODB;

// const initializeDatabase = async () => {
//   await mongoose
//     .connect(mongoUri)
//     .then(() => {
//       console.log("Connected to Database");
//     })
//     .catch((error) => console.error("Error connecting to database", error));
// };

// module.exports = { initializeDatabase };

const mongoose = require("mongoose");
require("dotenv").config();

let isConnected = false;

const initializeDatabase = async () => {
  if (isConnected) {
    console.log("MongoDB already connected.");
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB, {
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10,
    });

    isConnected = db.connections[0].readyState === 1;

    console.log("MongoDB Connected:", isConnected);
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

module.exports = { initializeDatabase };
