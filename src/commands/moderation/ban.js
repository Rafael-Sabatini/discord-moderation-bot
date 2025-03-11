const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    if (!interaction.member.permissions.has("BanMembers")) {
      return interaction.reply({
        content: "You don't have permission to ban members!",
        ephemeral: true,
      });
    }

    try {
      await interaction.guild.members.ban(user, { reason });

      // Log the ban action
      await logAction(interaction.guild, "BANS", {
        type: "ban",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });

      await interaction.reply(
        `Successfully banned ${user.tag} for reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error trying to ban this user!",
        ephemeral: true,
      });
    }
  },
};
