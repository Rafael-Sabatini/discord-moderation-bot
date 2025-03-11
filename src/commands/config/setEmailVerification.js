const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const EmailVerification = require("../../database/models/EmailVerification");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify your email address")
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    try {
      // Check if user is already verified
      const existingVerification = await EmailVerification.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        verified: true,
      });

      if (existingVerification) {
        return interaction.reply({
          content: "You are already verified!",
          ephemeral: true,
        });
      }

      // Create modal for email input
      const modal = new ModalBuilder()
        .setCustomId("emailVerificationModal")
        .setTitle("Email Verification");

      const emailInput = new TextInputBuilder()
        .setCustomId("emailInput")
        .setLabel("Enter your email address")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("example@email.com")
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(320);

      const firstActionRow = new ActionRowBuilder().addComponents(emailInput);
      modal.addComponents(firstActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error("Error in email verification:", error);
      await interaction.reply({
        content: "An error occurred while processing your verification.",
        ephemeral: true,
      });
    }
  },
};
