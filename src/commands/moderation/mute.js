const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout (mute) a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to timeout")
        .setRequired(true)
    )
    .addIntegerOption(
      (option) =>
        option
          .setName("duration")
          .setDescription("Timeout duration in minutes")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(40320) // 4 weeks in minutes
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
    ),
  async execute(interaction) {
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

    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "You don't have permission to timeout members!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const duration = interaction.options.getInteger("duration");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id);

    try {
      await member.timeout(duration * 60 * 1000, reason); // Convert minutes to milliseconds
      // Log the timeout action
      const { logAction } = require("../../utils/logging");
      await logAction(interaction.guild, "timeouts", {
        type: "timeout",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
        duration: `${duration} minutes`,
      });
      await interaction.reply(
        `Successfully muted ${user.tag} for ${duration} minutes.\nReason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to timeout this user!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to timeout this user!",
          ephemeral: true,
        });
      }
    }
  },
};
