const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
];

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
    // Ensure command visibility in every channel
    await interaction.reply({
      content: "Command executed successfully.",
      ephemeral: false,
    });

    const memberRoles = interaction.member.roles.cache.map((role) => role.id);
    const hasPermission = ALLOWED_ROLES.some((roleId) =>
      memberRoles.includes(roleId)
    );

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to use this command!",
        ephemeral: true,
      });
    }

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
      // DM the user about the ban
      try {
        await user.send(
          `You have been banned from ${interaction.guild.name} by ${interaction.user.tag} for: ${reason}`
        );
      } catch (dmError) {
        // Ignore DM errors (user may have DMs off)
      }

      await interaction.guild.members.ban(user, { reason });

      // Log the ban action
      await logAction(interaction.guild, "bans", {
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
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to ban this user!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to ban this user!",
          ephemeral: true,
        });
      }
    }
  },
};
