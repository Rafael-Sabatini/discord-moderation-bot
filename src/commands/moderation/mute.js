const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");


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
    .setName("mute")
    .setDescription("Timeout (mute) a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to timeout")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Timeout duration in days")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(28)
    )
    .addIntegerOption((option) =>
      option
        .setName("hours")
        .setDescription("Timeout duration in hours")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(23)
    )
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Timeout duration in minutes")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(59)
    )
    .addIntegerOption((option) =>
      option
        .setName("seconds")
        .setDescription("Timeout duration in seconds (must be at least 1)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(59)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
    ),
  async execute(interaction) {
    // Defer reply immediately to prevent interaction timeout
    await interaction.deferReply();
    
    // Permission check: allow bot owner bypass
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    if (!hasRolePermission && !isBotOwner) {
      return interaction.editReply({ content: "You don't have permission to use this command!" });
    }
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.editReply({ content: "You don't have permission to timeout members!" });
    }
    const user = interaction.options.getUser("user");
    if (!user) {
      return interaction.editReply({ content: "You must specify a user to mute." });
    }
    const days = interaction.options.getInteger("days") || 0;
    const hours = interaction.options.getInteger("hours") || 0;
    const minutes = interaction.options.getInteger("minutes") || 0;
    const seconds = interaction.options.getInteger("seconds") || 0;
    if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
      return interaction.editReply({ content: "You must specify a timeout duration (at least 1 second)." });
    }
    const durationMs =
      days * 24 * 60 * 60 * 1000 +
      hours * 60 * 60 * 1000 +
      minutes * 60 * 1000 +
      seconds * 1000;
    const reason = interaction.options.getString("reason") || "No reason provided";
    let member;
    try {
      member = await interaction.guild.members.fetch(user.id);
    } catch (err) {
      await interaction.editReply({ content: `Could not find user in guild: ${user.tag}` });
      return;
    }
    let durationStr = [];
    if (days) durationStr.push(`${days}d`);
    if (hours) durationStr.push(`${hours}h`);
    if (minutes) durationStr.push(`${minutes}m`);
    if (seconds) durationStr.push(`${seconds}s`);
    const durationText = durationStr.join(" ") || "1s";
    // Attempt to DM the user before muting
    try {
      await user.send(`You have been muted in **${interaction.guild.name}** for ${durationText}.\nReason: ${reason}`);
    } catch (dmError) {
      // DM failed (user may have DMs closed), continue anyway
    }

    try {
      await member.timeout(durationMs, reason);
      // Send the response immediately
      await interaction.editReply({
        content: `Successfully muted ${user.tag} for ${durationText}.\nReason: ${reason}`,
      });
      
      // Log the timeout action asynchronously
      const { logAction } = require("../../utils/logging");
      logAction(interaction.guild, "timeouts", {
        type: "timeout",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
        duration: durationText,
      }).catch((err) => console.error("Failed to log mute action:", err));
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error trying to timeout this user!",
      });
    }
  },
};
