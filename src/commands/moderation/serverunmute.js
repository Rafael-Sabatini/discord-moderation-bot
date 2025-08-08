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
    .setName("serverunmute")
    .setDescription("Unmute a user in voice channels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unmute in voice channels")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unmute")
        .setRequired(false)
    ),
  async execute(interaction) {
    const memberRoles = interaction.member.roles.cache.map((role) => role.id);
    const hasPermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to use this command!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    try {
      const member = await interaction.guild.members.fetch(user.id);

      // Check if the user is in a voice channel
      if (!member.voice || !member.voice.channel) {
        return interaction.reply({
          content: `${user.tag} is not currently in a voice channel!`,
          ephemeral: true,
        });
      }

      await member.voice.setMute(false, reason);

      // Log the unmute action
      await logAction(interaction.guild, "vcMutes", {
        type: "vcUnmute",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });

      await interaction.reply(
        `Successfully unmuted ${user.tag} in voice channels for reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to unmute this user in voice channels!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to unmute this user in voice channels!",
          ephemeral: true,
        });
      }
    }
  },
};
