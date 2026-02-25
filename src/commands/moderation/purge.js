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

async function purgeUserFromAllChannels(interaction, targetUser, range) {
  try {
    await interaction.editReply({
      content: `Searching for messages from ${targetUser.tag} across all channels...`,
    });
  } catch (editError) {
    console.warn("[PURGE] Could not update interaction reply:", editError.message);
  }

  const guild = interaction.guild;
  const channels = Array.from(guild.channels.cache.values()).filter(ch => ch.isTextBased() && !ch.isThread());
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  
  // Fetch messages from all channels in parallel for speed
  const fetchPromises = channels.map(async (channel) => {
    try {
      // Check if bot has permission in this channel
      if (!channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ManageMessages)) {
        return [];
      }

      // Fetch messages - use a larger limit to find enough user messages
      const messages = await channel.messages.fetch({ limit: 100 });
      
      // Filter by user and age, and return with channel info
      const userMessages = messages.filter(msg => 
        msg.author.id === targetUser.id && 
        msg.createdTimestamp > twoWeeksAgo
      );

      return Array.from(userMessages.values()).map(msg => ({
        message: msg,
        channel: channel,
        timestamp: msg.createdTimestamp
      }));
    } catch (error) {
      console.error(`[PURGE] Error fetching from channel ${channel.name}:`, error);
      return [];
    }
  });

  // Wait for all fetches to complete
  const results = await Promise.allSettled(fetchPromises);
  const allUserMessages = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);

  // Sort by timestamp (newest first) and limit to range
  allUserMessages.sort((a, b) => b.timestamp - a.timestamp);
  const messagesToDelete = allUserMessages.slice(0, range);

  if (messagesToDelete.length === 0) {
    return await interaction.editReply({
      content: `No messages found from ${targetUser.tag} within the last 14 days.`,
    });
  }

  try {
    await interaction.editReply({
      content: `Starting purge of ${messagesToDelete.length} message(s) from ${targetUser.tag}...`,
    });
  } catch (editError) {
    console.warn("[PURGE] Could not update interaction reply:", editError.message);
  }

  // Group messages by channel for efficient bulk deletion
  const messagesByChannel = new Map();
  for (const item of messagesToDelete) {
    if (!messagesByChannel.has(item.channel.id)) {
      messagesByChannel.set(item.channel.id, []);
    }
    messagesByChannel.get(item.channel.id).push(item);
  }

  let totalDeleted = 0;
  let totalFailed = 0;
  const allMessageTranscripts = [];

  // Delete messages channel by channel
  for (const [channelId, items] of messagesByChannel) {
    const channel = items[0].channel;
    const messages = items.map(item => item.message);

    // Capture transcript data
    const channelTranscript = messages.map(msg => ({
      author: msg.author?.tag || "Unknown user",
      content: msg.content || "(no content)",
      createdAt: msg.createdAt,
      channel: channel.name,
      attachments: msg.attachments ? Array.from(msg.attachments.values()).map(att => att.url) : []
    }));
    allMessageTranscripts.push(...channelTranscript);

    // Delete in batches of 100
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      try {
        const deleted = await channel.bulkDelete(batch, true);
        totalDeleted += deleted.size;
      } catch (error) {
        console.error(`[PURGE] Failed to bulk delete in ${channel.name}:`, error);
        // Fall back to individual deletion
        for (const message of batch) {
          try {
            await message.delete();
            totalDeleted++;
          } catch (err) {
            console.error(`[PURGE] Failed to delete message ${message.id}:`, err);
            totalFailed++;
          }
        }
      }
    }
  }

  const channelCount = messagesByChannel.size;

  // Send result
  const resultMessage = totalFailed > 0
    ? `Successfully deleted ${totalDeleted} message(s) from ${targetUser.tag} across ${channelCount} channel(s). Failed to delete ${totalFailed} message(s).`
    : `Successfully deleted ${totalDeleted} message(s) from ${targetUser.tag} across ${channelCount} channel(s).`;

  try {
    await interaction.editReply({ content: resultMessage });
  } catch (editError) {
    console.warn("[PURGE] Could not edit reply, using followUp:", editError.message);
    try {
      await interaction.followUp({ content: resultMessage, ephemeral: true });
    } catch (followUpError) {
      console.error("[PURGE] Could not send followUp either:", followUpError.message);
    }
  }

  // Log the purge action
  if (totalDeleted > 0) {
    logAction(interaction.guild, "purged", {
      type: "purge",
      channel: { name: `${channelCount} channels` },
      moderator: interaction.user,
      reason: `Purged ${totalDeleted} messages from ${targetUser.tag}`,
      deletedCount: totalDeleted,
      messages: allMessageTranscripts,
    }).catch((logError) => console.error("[PURGE] Failed to log purge action:", logError));
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete messages from a channel or all channels for a specific user")
    .addIntegerOption((option) =>
      option
        .setName("range")
        .setDescription("Number of messages to check per channel (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Purge all messages from this user across all channels (optional)")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to delete messages from (ignored if user is specified)")
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

    // Validate range
    if (range < 1 || range > 100) {
      return interaction.editReply({
        content: "Range must be between 1 and 100 messages.",
      });
    }

    try {
      // If user is specified, purge from ALL channels
      if (targetUser) {
        return await purgeUserFromAllChannels(interaction, targetUser, range);
      }

      // Otherwise, purge from single channel (original behavior)
      // Validate channel is a text channel
      if (!targetChannel.isTextBased()) {
        return interaction.editReply({
          content: "The specified channel is not a text channel!",
          flags: 64,
        });
      }
      // Ensure bot has ManageMessages permission in the target channel
      if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return await interaction.editReply({
          content: "I don't have permission to manage messages in that channel.",
        });
      }

      // Get the bot's reply to exclude it from deletion
      let botReplyMessage;
      try {
        botReplyMessage = await interaction.fetchReply();
      } catch (err) {
        console.warn("[PURGE] Could not fetch bot reply message:", err.message);
      }

      // Fetch messages to delete
      let messages = await targetChannel.messages.fetch({ limit: range });

      // Filter out the bot's interaction reply to prevent deleting our own message
      if (botReplyMessage) {
        messages = messages.filter((msg) => msg.id !== botReplyMessage.id);
      }

      // Filter out messages older than 14 days (Discord API limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const deletableMessages = messages.filter((msg) => msg.createdTimestamp > twoWeeksAgo);

      if (deletableMessages.size === 0) {
        return await interaction.editReply({
          content: `No messages found in the range or within 14 days.`,
        });
      }

      // Notify user we're starting the purge
      try {
        await interaction.editReply({
          content: `Starting purge of ${deletableMessages.size} message(s)...`,
        });
      } catch (editError) {
        console.warn("[PURGE] Could not update interaction reply:", editError.message);
      }

      // Capture message data for transcript before deletion
      const messageTranscript = Array.from(deletableMessages.values()).map(msg => ({
        author: msg.author?.tag || "Unknown user",
        content: msg.content || "(no content)",
        createdAt: msg.createdAt,
        attachments: msg.attachments ? Array.from(msg.attachments.values()).map(att => att.url) : []
      }));

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
          ? `Successfully deleted ${deletedCount} message(s) in ${targetChannel.name}. Failed to delete ${failedCount} message(s).`
          : `Successfully deleted ${deletedCount} message(s) in ${targetChannel.name}.`;

      try {
        await interaction.editReply({ content: resultMessage });
      } catch (editError) {
        // If editReply fails (message was deleted), use followUp instead
        console.warn("[PURGE] Could not edit reply, using followUp:", editError.message);
        try {
          await interaction.followUp({ content: resultMessage, ephemeral: true });
        } catch (followUpError) {
          console.error("[PURGE] Could not send followUp either:", followUpError.message);
        }
      }
      
      // Log the purge action asynchronously (don't wait for it)
      logAction(interaction.guild, "purged", {
        type: "purge",
        channel: targetChannel,
        moderator: interaction.user,
        reason: "Bulk message purge",
        deletedCount: deletedCount,
        messages: messageTranscript,
      }).catch((logError) => console.error("[PURGE] Failed to log purge action:", logError));
    } catch (error) {
      console.error("[PURGE] Error during purge command:", error);
      try {
        await interaction.editReply({
          content: "There was an error trying to purge messages!",
        });
      } catch (replyError) {
        console.error("Failed to send error reply:", replyError.message);
        // Try followUp as last resort
        try {
          await interaction.followUp({
            content: "There was an error trying to purge messages!",
            ephemeral: true,
          });
        } catch (followUpError) {
          console.error("Failed to send error followUp:", followUpError.message);
        }
      }
    }
  },
};
