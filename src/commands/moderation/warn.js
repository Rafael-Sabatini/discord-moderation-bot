const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Warning = require("../../database/models/warning");
const { logAction } = require("../../utils/logging");
const { thresholds } = require("../config/warningConfig");



const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
  "1437842615528722535", // Added user
];
const BOT_OWNER_ID = process.env.OWNER_ID || null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
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
    // Permission check: allow bot owner bypass
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    if (!hasRolePermission && !isBotOwner) {
      return interaction.reply({ content: "You don't have permission to use this command!", flags: 64 });
    }
    const user = interaction.options.getUser("user");
    if (!user) {
      return interaction.reply({ content: "You must specify a user to warn.", flags: 64 });
    }
    const reason = interaction.options.getString("reason");
    if (!reason) {
      return interaction.reply({ content: "You must specify a reason for the warning.", flags: 64 });
    }
    await interaction.deferReply();
    try {
      // DM the user about the warning
      try {
        await user.send(`You have been warned in ${interaction.guild.name} by ${interaction.user.tag} for: ${reason}`);
      } catch (dmError) {
        // Ignore DM errors (user may have DMs off)
      }
      const warning = new Warning({
        userId: user.id,
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        reason: reason,
        timestamp: new Date(),
      });
      await warning.save();
      // Get total warnings for the user
      const warningCount = await Warning.countDocuments({
        userId: user.id,
        guildId: interaction.guild.id,
      });
      let additionalAction = "";
      // Check thresholds and take appropriate action
      if (warningCount >= thresholds.ban.count) {
        try {
          await user.send(`You have been automatically banned from ${interaction.guild.name} for exceeding the warning limit. Moderator: ${interaction.user.tag}`);
        } catch (dmError) {}
        try {
          await interaction.guild.members.ban(user.id, {
            reason: `Exceeded maximum warnings (${thresholds.ban.count})`,
          });
          additionalAction = "\nUser has been automatically banned for exceeding warning limit.";
        } catch (error) {
          console.error("Failed to ban user:", error);
        }
      } else if (warningCount >= thresholds.mute.count) {
        const member = await interaction.guild.members.fetch(user.id);
        try {
          await user.send(`You have been automatically muted in ${interaction.guild.name} for exceeding the warning threshold. Moderator: ${interaction.user.tag}`);
        } catch (dmError) {}
        try {
          await member.timeout(
            thresholds.mute.duration,
            `Exceeded warning threshold (${thresholds.mute.count})`
          );
          additionalAction = "\nUser has been automatically muted for 1 hour.";
        } catch (error) {
          console.error("Failed to timeout user:", error);
        }
      }
      // Log the warning action with warning ID
      await logAction(interaction.guild, "warnings", {
        type: "warn",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
        warnId: warning._id.toString(),
      });
      await interaction.editReply(
        `Successfully warned ${user.tag} for reason: ${reason}\nThis user now has ${warningCount} warning(s).${additionalAction}`
      );
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error trying to warn this user!",
        });
      } else {
        await interaction.reply({
          content: "There was an error trying to warn this user!",
          ephemeral: true,
        });
      }
    }
  },
};
