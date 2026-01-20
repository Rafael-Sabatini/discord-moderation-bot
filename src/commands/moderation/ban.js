const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");
const Ban = require("../../database/models/ban");


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
    .setName("ban")
    .setDescription("Ban a user from the server")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days for temporary ban (leave empty for permanent)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(365)
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
      return interaction.editReply({
        content: "You don't have permission to use this command!",
      });
    }

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const banDays = interaction.options.getInteger("days");
    
    if (!user) {
      return interaction.editReply({ content: "You must specify a user to ban." });
    }
    if (!interaction.member.permissions.has("BanMembers")) {
      return interaction.editReply({ content: "You don't have permission to ban members!" });
    }
    try {
      const isPermanent = !banDays;
      let expiryDate = null;
      let banMessage = `Successfully banned ${user.tag} for reason: ${reason}\nTheir messages from the last 7 days have been deleted.`;
      
      if (banDays) {
        expiryDate = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);
        banMessage += `\nThis is a temporary ban that will expire on ${expiryDate.toDateString()}.`;
      } else {
        banMessage += `\nThis is a permanent ban.`;
      }

      // DM the user about the ban
      try {
        const dmMessage = `You have been banned from ${interaction.guild.name} by ${interaction.user.tag} for: ${reason}${isPermanent ? '' : `\nThis ban will expire on ${expiryDate.toDateString()}.`}`;
        await user.send(dmMessage);
      } catch (dmError) {
        console.log(`[BAN] Could not DM user ${user.tag}: ${dmError.message}`);
      }

      // Delete up to 7 days of messages using Discord's built-in option
      await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: 60 * 60 * 24 * 7 });
      
      // Record ban in database
      const ban = new Ban({
        userId: user.id,
        guildId: interaction.guild.id,
        moderatorId: interaction.user.id,
        reason: reason,
        banDate: new Date(),
        expiryDate: expiryDate,
        isPermanent: isPermanent,
        isActive: true,
      });
      await ban.save();

      // Send the response immediately
      await interaction.editReply({ content: banMessage });
      
      // Log the ban action asynchronously
      logAction(interaction.guild, "bans", {
        type: "ban",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
        duration: isPermanent ? "Permanent" : `${banDays} days`,
      }).catch((err) => console.error("Failed to log ban action:", err));
    } catch (error) {
      console.error("Ban command error:", error);
      await interaction.editReply({ content: `There was an error trying to ban this user! (${error.message})` });
    }
  },
};
