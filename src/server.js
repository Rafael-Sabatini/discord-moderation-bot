const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("Missing MONGODB_URI environment variable!");
  process.exit(1);
}

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Import Models
const User = require("./database/models/user");
const Warning = require("./database/models/warning");
const JailedUser = require("./database/models/jailedUser");

// API Routes

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    message: "Discord Moderation Bot API is running",
    timestamp: new Date().toISOString(),
  });
});

// Users endpoints
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { userId, email, accountAge } = req.body;

    if (!userId || !email || !accountAge) {
      return res
        .status(400)
        .json({ error: "Missing required fields: userId, email, accountAge" });
    }

    const user = new User({
      userId,
      email,
      accountAge: new Date(accountAge),
      isVerified: false,
    });

    await user.save();
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "User or email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/:userId", async (req, res) => {
  try {
    const { isVerified, email } = req.body;
    const updateData = {};

    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (email !== undefined) updateData.email = email;

    const user = await User.findOneAndUpdate(
      { userId: req.params.userId },
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:userId", async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Warnings endpoints
app.get("/api/warnings", async (req, res) => {
  try {
    const warnings = await Warning.find();
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/warnings/:userId", async (req, res) => {
  try {
    const warnings = await Warning.find({ userId: req.params.userId });
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/warnings", async (req, res) => {
  try {
    const { userId, guildId, moderatorId, reason } = req.body;

    if (!userId || !guildId || !moderatorId || !reason) {
      return res.status(400).json({
        error:
          "Missing required fields: userId, guildId, moderatorId, reason",
      });
    }

    const warning = new Warning({
      userId,
      guildId,
      moderatorId,
      reason,
    });

    await warning.save();
    res.status(201).json(warning);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/warnings/:warningId", async (req, res) => {
  try {
    const warning = await Warning.findByIdAndDelete(req.params.warningId);
    if (!warning) {
      return res.status(404).json({ error: "Warning not found" });
    }
    res.json({ message: "Warning deleted successfully", warning });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Jailed Users endpoints
app.get("/api/jailed-users", async (req, res) => {
  try {
    const jailedUsers = await JailedUser.find();
    res.json(jailedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/jailed-users/:userId", async (req, res) => {
  try {
    const jailedUser = await JailedUser.findOne({
      userId: req.params.userId,
    });
    if (!jailedUser) {
      return res.status(404).json({ error: "User not found in jail" });
    }
    res.json(jailedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/jailed-users", async (req, res) => {
  try {
    const { userId, guildId } = req.body;

    if (!userId || !guildId) {
      return res
        .status(400)
        .json({ error: "Missing required fields: userId, guildId" });
    }

    const jailedUser = new JailedUser({
      userId,
      guildId,
    });

    await jailedUser.save();
    res.status(201).json(jailedUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "User is already jailed" });
    }
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/jailed-users/:userId", async (req, res) => {
  try {
    const jailedUser = await JailedUser.findOneAndDelete({
      userId: req.params.userId,
    });
    if (!jailedUser) {
      return res.status(404).json({ error: "User not found in jail" });
    }
    res.json({ message: "User released from jail", jailedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  await mongoose.connection.close();
  process.exit(0);
});
