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
    .setName("servermute")
    .setDescription("Mute a user in voice channels only")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to mute in voice channels")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the mute")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Mute duration in minutes (optional)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1440) // Maximum 24 hours
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
    const reason = interaction.options.getString("reason");
    const duration = interaction.options.getInteger("duration");

    try {
      const member = await interaction.guild.members.fetch(user.id);

      // Check if the user is in a voice channel
      if (!member.voice || !member.voice.channel) {
        return interaction.reply({
          content: `${user.tag} is not currently in a voice channel!`,
          ephemeral: true,
        });
      }

      await member.voice.setMute(true, reason);

      // Log the server mute action
      await logAction(interaction.guild, "vcMutes", {
        type: "vcMute",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
        duration: duration ? `${duration} minutes` : "Indefinite",
      });

      await interaction.reply(
        `Successfully muted ${user.tag} in voice channels for reason: ${reason}${
          duration ? `\nDuration: ${duration} minutes` : ""
        }`
      );

      // Schedule unmute if duration is provided
      if (duration) {
        setTimeout(async () => {
          try {
            await member.voice.setMute(false, "Mute duration expired");
            await logAction(interaction.guild, "vcMutes", {
              type: "vcUnmute",
              user: user,
              moderator: interaction.client.user,
              reason: "Mute duration expired",
              targetId: user.id,
            });
          } catch (error) {
            console.error(`Failed to unmute ${user.tag} after duration:`, error);
          }
        }, duration * 60 * 1000); // Convert minutes to milliseconds
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to mute this user in voice channels!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to mute this user in voice channels!",
          ephemeral: true,
        });
      }
    }
  },
};
