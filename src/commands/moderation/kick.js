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
    .setName("kick")
    .setDescription("Kick a user from the server")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick")
        .setRequired(false)
    ),
  async execute(interaction) {
    // Ensure command visibility in every channel
    await interaction.reply({
      content: "Command executed successfully.",
      ephemeral: false,
    });

    const memberRoles = interaction.member.roles.cache.map((role) => role.id);
    const hasPermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to use this command!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    if (!interaction.member.permissions.has("KickMembers")) {
      return interaction.reply({
        content: "You don't have permission to kick members!",
        ephemeral: true,
      });
    }

    try {
      await interaction.guild.members.kick(user, reason);

      // Log the kick action
      await logAction(interaction.guild, "KICKS", {
        type: "kick",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });

      await interaction.reply(
        `Successfully kicked ${user.tag} for reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to kick this user!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to kick this user!",
          ephemeral: true,
        });
      }
    }
  },
};
