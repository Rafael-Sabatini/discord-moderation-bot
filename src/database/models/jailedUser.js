const mongoose = require("mongoose");

const jailedUserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  jailedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("JailedUser", jailedUserSchema);
