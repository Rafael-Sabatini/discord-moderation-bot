const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setaccountage")
    .setDescription("Set the required account age for users to access the server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("The required account age in days")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(365)
    ),
  async execute(interaction) {
    const requiredAge = interaction.options.getInteger("days");

    const memberRoles = interaction.member.roles.cache.map((role) => role.id);
    const hasPermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to use this command!",
        ephemeral: true,
      });
    }

    // Update the configuration
    require("../../config").requiredAccountAge = requiredAge;

    await interaction.reply({
      content: `Successfully set the required account age to ${requiredAge} days.`,
      ephemeral: true,
    });
  },
};