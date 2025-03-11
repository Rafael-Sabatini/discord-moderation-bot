const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addStringOption((option) =>
      option
        .setName("userid")
        .setDescription("The ID of the user to unban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unban")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has("BanMembers")) {
      return interaction.reply({
        content: "You don't have permission to unban members!",
        ephemeral: true,
      });
    }

    const userId = interaction.options.getString("userid");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    try {
      // Fetch the banned user before unbanning
      const banInfo = await interaction.guild.bans.fetch(userId);
      const bannedUser = banInfo.user;

      // Unban the user
      await interaction.guild.members.unban(userId, reason);

      // Log the unban action
      await logAction(interaction.guild, "BANS", {
        type: "unban",
        user: bannedUser,
        moderator: interaction.user,
        reason: reason,
        targetId: userId,
      });

      await interaction.reply(
        `Successfully unbanned ${bannedUser.tag}. Reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content:
          "Failed to unban the user. Make sure the ID is correct and the user is banned.",
        ephemeral: true,
      });
    }
  },
};
