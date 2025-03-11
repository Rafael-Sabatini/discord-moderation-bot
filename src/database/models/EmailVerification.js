const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../../utils/encryption");

const emailVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    guildId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      set: encrypt,
      get: decrypt,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      select: false, // Don't include in query results by default
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // Automatically delete unverified records after 1 hour
    },
  },
  {
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Add index for faster queries
emailVerificationSchema.index({ userId: 1, guildId: 1 });

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);
