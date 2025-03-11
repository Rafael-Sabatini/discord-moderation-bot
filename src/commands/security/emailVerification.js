const { SlashCommandBuilder } = require("discord.js");
const EmailVerification = require("../../database/models/EmailVerification");
const { encrypt } = require("../../utils/encryption");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify-code")
    .setDescription("Verify your email with the code sent")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The verification code sent to your email")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const code = interaction.options.getString("code");
      const verification = await EmailVerification.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      });

      if (!verification) {
        return interaction.reply({
          content:
            "Please start the verification process with `/verify` first.",
          ephemeral: true,
        });
      }

      if (verification.verificationCode !== code) {
        return interaction.reply({
          content: "Invalid verification code. Please try again.",
          ephemeral: true,
        });
      }

      // Update verification status
      verification.verified = true;
      verification.verificationCode = null;
      await verification.save();

      // Restore channel permissions
      const member = await interaction.guild.members.fetch(interaction.user.id);
      interaction.guild.channels.cache.forEach((channel) => {
        channel.permissionOverwrites.delete(member);
      });

      await interaction.reply({
        content:
          "Email verified successfully! You now have access to the server.",
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      await interaction.reply({
        content: "An error occurred while verifying your code.",
        ephemeral: true,
      });
    }
  },
};
