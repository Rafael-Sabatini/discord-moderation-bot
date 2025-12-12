const { logAction } = require("../utils/logging");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
];

module.exports = {
  name: "messageDelete",
  async execute(client, message) {
    // Basic guards
    if (!message) return;

    // If message is partial, try to fetch full version
    if (message.partial) {
      try {
        message = await message.fetch();
      } catch (err) {
        // Can't fetch; skip logging to avoid logging incomplete data
        console.error("[EVENT] Could not fetch partial message in messageDelete");
        return;
      }
    }

    // Ignore bot messages and non-guild messages
    if (message.author?.bot || !message.guild) return;

    // If the message only contains a GIF embed (e.g., from Tenor/Giphy), skip logging
    if (
      message.embeds &&
      message.embeds.length === 1 &&
      message.embeds[0].type === "gifv" &&
      (!message.content || message.content.trim() === "")
    ) {
      return;
    }

    try {
      let moderator = null;
      let shouldLog = true;
      // Try to fetch the audit log for message deletions
      if (message.guild && message.guild.members.me.permissions.has("ViewAuditLog")) {
        const fetchedLogs = await message.guild.fetchAuditLogs({
          limit: 10,
          type: 72, // MESSAGE_DELETE
        });
        // Find the most recent relevant entry (within 15 seconds)
        const deletionLog = fetchedLogs.entries.find(entry =>
          entry.target?.id === message.author.id &&
          entry.extra?.channel?.id === message.channel.id &&
          Date.now() - entry.createdTimestamp < 15000
        );
        if (deletionLog) {
          moderator = deletionLog.executor;
          // Only log if the deleter is in allowed roles
          if (moderator && message.guild) {
            const member = await message.guild.members.fetch(moderator.id).catch(() => null);
            if (member) {
              const modRoles = member.roles.cache.map(r => r.id);
              shouldLog = ALLOWED_ROLES.some(roleId => modRoles.includes(roleId));
            }
          }
        }
      }

      if (shouldLog) {
        await logAction(message.guild, "messages", {
          author: message.author,
          channel: message.channel ? message.channel.name : "unknown",
          content: message.content || "(no text content)",
          attachments: message.attachments,
          embeds: message.embeds,
          action: "deleted",
          moderator: moderator,
          targetId: message.id,
        });
      }
    } catch (error) {
        console.error("[EVENT] Error in messageDelete:", error);
    }
  },
};
