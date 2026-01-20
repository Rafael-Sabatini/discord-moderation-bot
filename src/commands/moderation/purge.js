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
    .setName("purge")
    .setDescription("Delete messages from a channel or specific user")
    .addIntegerOption((option) =>
      option
        .setName("range")
        .setDescription("Number of messages to delete (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Specific user to delete messages from (optional)")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to delete messages from (defaults to current channel)")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Defer reply immediately to prevent interaction timeout
    await interaction.deferReply();
    
    // Permission check: allow bot owner, guild owner, or users with role/ManageMessages permission
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    const isGuildOwner = interaction.member.id === interaction.guild.ownerId;
    const hasPermission = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);
    
    if (!hasRolePermission && !isBotOwner && !isGuildOwner && !hasPermission) {
      console.error(`[PURGE] Permission denied. User: ${interaction.user.id}, BOT_OWNER_ID: ${BOT_OWNER_ID}, hasRolePermission: ${hasRolePermission}, isBotOwner: ${isBotOwner}, isGuildOwner: ${isGuildOwner}, hasPermission: ${hasPermission}`);
      return interaction.editReply({ content: "You don't have permission to use this command!" });
    }

    // Get options
    const range = interaction.options.getInteger("range");
    const targetUser = interaction.options.getUser("user");
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

    // Validate channel is a text channel
    if (!targetChannel.isTextBased()) {
      return interaction.editReply({
        content: "The specified channel is not a text channel!",
        flags: 64,
      });
    }

    // Validate range
    if (range < 1 || range > 100) {
      return interaction.editReply({
        content: "Range must be between 1 and 100 messages.",
      });
    }

    try {
      // Ensure bot has ManageMessages permission in the target channel
      if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return await interaction.editReply({
          content: "I don't have permission to manage messages in that channel.",
        });
      }

      // Fetch messages to delete
      let messages = await targetChannel.messages.fetch({ limit: range });

      // Filter by user if specified
      if (targetUser) {
        messages = messages.filter((msg) => msg.author.id === targetUser.id);
      }

      // Filter out messages older than 14 days (Discord API limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletableMessages = messages.filter((msg) => msg.createdTimestamp > twoWeeksAgo);

      if (deletableMessages.size === 0) {
        return await interaction.editReply({
          content: targetUser
            ? `No messages found from ${targetUser.tag} within the range or within 14 days.`
            : `No messages found in the range or within 14 days.`,
        });
      }

      // Notify user we're starting the purge
      await interaction.editReply({
        content: `Starting purge of ${deletableMessages.size} message(s)...`,
      });

      // Delete messages using bulk delete (much faster, handles up to 100 at a time)
      let deletedCount = 0;
      let failedCount = 0;
      const messagesToDelete = Array.from(deletableMessages.values());

      // Process in batches of up to 100 messages
      for (let i = 0; i < messagesToDelete.length; i += 100) {
        const batch = messagesToDelete.slice(i, i + 100);
        try {
          const deleted = await targetChannel.bulkDelete(batch, true);
          deletedCount += deleted.size;
        } catch (error) {
          console.error(`[PURGE] Failed to bulk delete batch:`, error);
          // Fall back to individual deletion for this batch
          for (const message of batch) {
            try {
              await message.delete();
              deletedCount++;
            } catch (err) {
              console.error(`[PURGE] Failed to delete message ${message.id}:`, err);
              failedCount++;
            }
          }
        }
      }

      // Reply with result first
      const resultMessage =
        failedCount > 0
          ? `Successfully deleted ${deletedCount} message(s) in ${targetChannel.name}. Failed to delete ${failedCount} message(s).${targetUser ? ` (from ${targetUser.tag})` : ""}`
          : `Successfully deleted ${deletedCount} message(s) in ${targetChannel.name}${targetUser ? ` from ${targetUser.tag}` : ""}.`;

      await interaction.editReply({ content: resultMessage });
      
      // Log the purge action asynchronously (don't wait for it)
      logAction(interaction.guild, "messages", {
        author: targetUser || { tag: "Multiple users" },
        channel: targetChannel.name,
        content: `Bulk deleted ${deletedCount} message(s)${targetUser ? ` from ${targetUser.tag}` : ""}`,
        action: "purged",
        moderator: interaction.user,
        targetId: targetUser ? targetUser.id : targetChannel.id,
      }).catch((logError) => console.error("[PURGE] Failed to log purge action:", logError));
    } catch (error) {
      console.error("[PURGE] Error during purge command:", error);
      await interaction.editReply({
        content: "There was an error trying to purge messages!",
      });
    }
  },
};
