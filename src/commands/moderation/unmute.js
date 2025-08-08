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
    .setName("unmute")
    .setDescription("Remove a user's timeout (mute)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unmute (remove timeout)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unmute")
        .setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

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

    try {
      const member = await interaction.guild.members.fetch(user.id);

      // Check if the user is currently timed out (muted)
      if (!member.communicationDisabledUntil || member.communicationDisabledUntilTimestamp < Date.now()) {
        return interaction.reply({
          content: `${user.tag} is not currently timed out (muted)!`,
          ephemeral: true,
        });
      }

      await member.timeout(null, reason);

      // Log the timeout removal action to the timeouts channel
      const { logAction } = require("../../utils/logging");
      await logAction(interaction.guild, "timeouts", {
        type: "timeout removal",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });

      await interaction.reply(
        `Successfully removed timeout (unmuted) for ${user.tag}. Reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to unmute (remove timeout) for this user!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to unmute (remove timeout) for this user!",
          ephemeral: true,
        });
      }
    }
  },
};
