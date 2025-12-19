const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  moderatorId: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    default: "No reason provided",
  },
  banDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    default: null, // null for permanent bans
  },
  isPermanent: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  dmSentOnExpiry: {
    type: Boolean,
    default: false,
  },
});

// Create compound index for uniqueness of active bans per user per guild
banSchema.index({ userId: 1, guildId: 1, isActive: 1 });

module.exports = mongoose.model("Ban", banSchema);
