const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Warning = require("../../database/models/warning");
const { logAction } = require("../../utils/logging");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "You don't have permission to warn members!",
        ephemeral: true,
      });
    }

    try {
      const warning = new Warning({
        userId: user.id,
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        reason: reason,
        timestamp: new Date(),
      });

      await warning.save();

      // Log the warning action
      await logAction(interaction.guild, "WARNS", {
        type: "warn",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });

      await interaction.reply(
        `Successfully warned ${user.tag} for reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error trying to warn this user!",
        ephemeral: true,
      });
    }
  },
};
