const mongoose = require("mongoose");

/**
 * MongoDB Connection Configuration
 * Supports both local MongoDB and MongoDB Atlas
 */

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("ERROR: MONGODB_URI environment variable is not set!");
  console.error("Please configure MongoDB connection in your .env file");
  process.exit(1);
}

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  minPoolSize: 2,
};

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
async function connectDB() {
  try {
    await mongoose.connect(mongoUri, mongooseOptions);
    console.log("✅ Successfully connected to MongoDB");

    // Log connection details (without credentials)
    const connection = mongoose.connection;
    console.log(`📊 Database: ${connection.name}`);
    console.log(`🖥️  Host: ${connection.host}`);

    // Handle connection events
    connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
    });

    connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error);
    throw error;
  }
}

/**
 * Get MongoDB connection status
 * @returns {String} Connection status
 */
function getConnectionStatus() {
  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting",
  };
  return states[mongoose.connection.readyState] || "Unknown";
}

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  mongoose,
};
