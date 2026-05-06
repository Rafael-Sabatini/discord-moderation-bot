const mongoose = require("mongoose");

const blockedWordSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  pattern: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ["critical", "non-critical"],
    default: "non-critical",
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BlockedWord", blockedWordSchema, "blockedwords");
