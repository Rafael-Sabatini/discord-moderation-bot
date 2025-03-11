const { Events } = require("discord.js");
const EmailVerification = require("../database/models/EmailVerification");
const nodemailer = require("nodemailer");
const { encrypt } = require("../utils/encryption");
require("dotenv").config();

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "emailVerificationModal") return;

    try {
      const email = interaction.fields.getTextInputValue("emailInput");

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return interaction.reply({
          content: "Please provide a valid email address.",
          ephemeral: true,
        });
      }

      // Check if email is already in use
      const existingEmail = await EmailVerification.findOne({ email });
      if (existingEmail) {
        return interaction.reply({
          content: "This email is already registered with another user.",
          ephemeral: true,
        });
      }

      // Generate verification code
      const verificationCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      // Save to database
      await EmailVerification.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guild.id },
        {
          email,
          verificationCode,
          verified: false,
        },
        { upsert: true }
      );

      // Send verification email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Discord Server Email Verification",
        html: `
                    <h1>Discord Email Verification</h1>
                    <p>Hello ${interaction.user.username},</p>
                    <p>Your verification code is: <strong>${verificationCode}</strong></p>
                    <p>Please use this code with the /verify-code command in Discord to complete your verification.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                `,
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Clean up database entry if email fails
        await EmailVerification.findOneAndDelete({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
        });
        return interaction.reply({
          content: "Failed to send verification email. Please try again later.",
          ephemeral: true,
        });
      }

      // Hide all channels except verification channel
      const verificationChannelId = process.env.VERIFICATION_CHANNEL_ID;
      const member = await interaction.guild.members.fetch(interaction.user.id);

      interaction.guild.channels.cache.forEach((channel) => {
        if (channel.id !== verificationChannelId) {
          channel.permissionOverwrites.create(member, {
            ViewChannel: false,
          });
        }
      });

      await interaction.reply({
        content:
          "✅ Verification code has been sent to your email. Please check your inbox and use `/verify-code` to enter the code.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error processing email verification:", error);
      await interaction.reply({
        content: "An error occurred while processing your verification.",
        ephemeral: true,
      });
    }
  },
};
