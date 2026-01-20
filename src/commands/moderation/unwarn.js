const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Warning = require("../../database/models/warning");
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
    .setName("unwarn")
    .setDescription("Remove a warning from a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove warning from")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("warnid")
        .setDescription("The ID of the warning to remove")
        .setRequired(true)
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
    const user = interaction.options.getUser("user");
    if (!user) {
      return interaction.editReply({ content: "You must specify a user to remove warning from." });
    }
    const warnId = interaction.options.getString("warnid");
    if (!warnId) {
      return interaction.editReply({ content: "You must specify a warning ID to remove." });
    }
    try {
      const warning = await Warning.findOneAndDelete({
        _id: warnId,
        userId: user.id,
        guildId: interaction.guild.id,
      });
      if (!warning) {
        await interaction.editReply({ content: "Warning not found or already removed." });
        return;
      }
      // Send the response immediately
      await interaction.editReply({ content: `Successfully removed warning from ${user.tag}.` });
      
      // Log the unwarn action asynchronously
      logAction(interaction.guild, "warnings", {
        type: "unwarn",
        user: user,
        moderator: interaction.user,
        targetId: user.id,
        warnId: warnId,
      }).catch((err) => console.error("Failed to log unwarn action:", err));
    } catch (error) {
      console.error("Unwarn command error:", error);
      await interaction.editReply({ content: "Failed to remove the warning." });
    }
  },
};
