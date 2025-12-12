const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");


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
      return interaction.reply({ content: "You must specify a user to unmute.", flags: 64 });
    }
    const reason = interaction.options.getString("reason") || "No reason provided";
    await interaction.deferReply();
    try {
      const member = await interaction.guild.members.fetch(user.id);
      // Check if the user is currently timed out (muted)
      if (!member.communicationDisabledUntil || member.communicationDisabledUntilTimestamp < Date.now()) {
        await interaction.editReply({ content: `${user.tag} is not currently timed out (muted)!` });
        return;
      }
      await member.timeout(null, reason);
      // Log the timeout removal action to the timeouts channel
      await logAction(interaction.guild, "timeouts", {
        type: "timeout removal",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });
      await interaction.editReply({ content: `Successfully removed timeout (unmuted) for ${user.tag}. Reason: ${reason}` });
    } catch (error) {
      console.error("Unmute command error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "There was an error trying to unmute (remove timeout) for this user!" });
      } else {
        await interaction.reply({ content: "There was an error trying to unmute (remove timeout) for this user!", flags: 64 });
      }
    }
  },
};
