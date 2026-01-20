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
    .setName("unban")
    .setDescription("Unban a user from the server")
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
    const userId = interaction.options.getString("userid");
    if (!userId) {
      return interaction.editReply({ content: "You must specify a user ID to unban." });
    }
    const reason = interaction.options.getString("reason") || "No reason provided";
    try {
      // Fetch the banned user before unbanning
      const banInfo = await interaction.guild.bans.fetch(userId);
      const bannedUser = banInfo.user;
      
      // Unban the user
      await interaction.guild.members.unban(userId, reason);
      
      // Send the response immediately
      await interaction.editReply({ content: `Successfully unbanned ${bannedUser.tag}. Reason: ${reason}` });
      
      // Log the unban action asynchronously
      logAction(interaction.guild, "bans", {
        type: "unban",
        user: bannedUser,
        moderator: interaction.user,
        reason: reason,
        targetId: userId,
      }).catch((err) => console.error("Failed to log unban action:", err));
    } catch (error) {
      console.error("Unban command error:", error);
      await interaction.editReply({ content: "Failed to unban the user. Make sure the ID is correct and the user is banned." });
    }
  },
};
