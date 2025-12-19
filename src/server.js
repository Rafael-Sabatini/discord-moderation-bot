const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Production mode detection
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

console.log(`[EXPRESS] Starting in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode`);

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

// Only connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose
    .connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'discord',
    })
    .then(() => console.log("✅ Connected to MongoDB Atlas - discord database"))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      // Don't exit here since the main index.js will handle it
    });
}

// Import Models
const User = require("./database/models/user");
const Warning = require("./database/models/warning");
const JailedUser = require("./database/models/jailedUser");
const Ban = require("./database/models/ban");
const { executeModerationAction } = require("./utils/apiModeration");

// Discord client reference
let client = null;

// Function to set the Discord client
function setDiscordClient(discordClient) {
  client = discordClient;
  console.log("[EXPRESS] Discord client initialized for API");
}

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

// Moderation API Endpoints

// Get all bans
app.get("/api/moderation/bans", async (req, res) => {
  try {
    const bans = await Ban.find();
    res.json(bans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active bans for a user in a guild
app.get("/api/moderation/bans/:guildId/:userId", async (req, res) => {
  try {
    const ban = await Ban.findOne({
      userId: req.params.userId,
      guildId: req.params.guildId,
      isActive: true,
    });
    if (!ban) {
      return res.status(404).json({ error: "No active ban found" });
    }
    res.json(ban);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ban a user
app.post("/api/moderation/ban", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason, days } = req.body;

    if (!guildId || !userId || !moderatorId || !reason) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId, reason",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "ban", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason,
      days: days || null,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API BAN] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Kick a user
app.post("/api/moderation/kick", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId || !reason) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId, reason",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "kick", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API KICK] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mute (timeout) a user
app.post("/api/moderation/mute", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason, durationMs } = req.body;

    if (!guildId || !userId || !moderatorId || !reason) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId, reason",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "mute", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason,
      duration: durationMs || 60 * 60 * 1000, // Default 1 hour
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API MUTE] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Unmute (remove timeout) a user
app.post("/api/moderation/unmute", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "unmute", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API UNMUTE] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Server mute (voice mute) a user
app.post("/api/moderation/servermute", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "servermute", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API SERVERMUTE] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Server unmute (voice unmute) a user
app.post("/api/moderation/serverunmute", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "serverunmute", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API SERVERUNMUTE] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Warn a user
app.post("/api/moderation/warn", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId || !reason) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId, reason",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "warn", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API WARN] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Unban a user
app.post("/api/moderation/unban", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "unban", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API UNBAN] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get warnings for a guild
app.get("/api/moderation/warnings/:guildId", async (req, res) => {
  try {
    const warnings = await Warning.find({ guildId: req.params.guildId });
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a warning
app.post("/api/moderation/unwarn", async (req, res) => {
  try {
    const { guildId, userId, moderatorId } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "unwarn", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: "Warning removed",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API UNWARN] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Jail a user
app.post("/api/moderation/jail", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "jail", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API JAIL] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Unjail a user
app.post("/api/moderation/unjail", async (req, res) => {
  try {
    const { guildId, userId, moderatorId, reason } = req.body;

    if (!guildId || !userId || !moderatorId) {
      return res.status(400).json({
        error: "Missing required fields: guildId, userId, moderatorId",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "unjail", {
      targetUserId: userId,
      moderatorId: moderatorId,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API UNJAIL] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Purge messages
app.post("/api/moderation/purge", async (req, res) => {
  try {
    const { guildId, channelId, moderatorId, count, reason } = req.body;

    if (!guildId || !channelId || !moderatorId || !count) {
      return res.status(400).json({
        error: "Missing required fields: guildId, channelId, moderatorId, count",
      });
    }

    if (!client) {
      return res.status(500).json({ error: "Discord client not initialized" });
    }

    const guild = await client.guilds.fetch(guildId);
    const result = await executeModerationAction(guild, client, "purge", {
      channelId: channelId,
      moderatorId: moderatorId,
      count: count,
      reason: reason || "No reason provided",
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[API PURGE] Error:", error);
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

// Only start if this file is run directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
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
} else {
  // When required as a module, start the server immediately
  const server = app.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = { app, setDiscordClient };
