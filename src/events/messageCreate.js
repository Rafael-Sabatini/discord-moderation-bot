const { PermissionsBitField } = require("discord.js");
const { logAction } = require("../utils/logging");
const BlockedWord = require("../database/models/blockedword");

const DISCORD_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+/i;
const MARKDOWN_HEADER_REGEX = /^#{1,3}\s+/m;
const INVITE_TIMEOUT_MS = 10 * 60 * 1000;
const CRITICAL_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const hasInviteLink = DISCORD_INVITE_REGEX.test(message.content || "");
    const hasMarkdownHeader = MARKDOWN_HEADER_REGEX.test(message.content || "");

    // Check for blocked words in the database
    let blockedWordMatch = null;
    try {
      const blockedWords = await BlockedWord.find({ guildId: message.guild.id });
      for (const blockedWord of blockedWords) {
        try {
          const regex = new RegExp(blockedWord.pattern, "i");
          if (regex.test(message.content || "")) {
            blockedWordMatch = blockedWord;
            break;
          }
        } catch (regexError) {
          console.error(`Invalid regex pattern for rule ${blockedWord._id}:`, regexError);
        }
      }
    } catch (error) {
      console.error("Error checking blocked words:", error);
    }

    if (!hasInviteLink && !hasMarkdownHeader && !blockedWordMatch) return;

    let violationType = "";
    let reason = "";
    let isCritical = false;

    if (hasInviteLink) {
      violationType = "Posted a Discord invite link";
    } else if (hasMarkdownHeader) {
      violationType = "Posted a Discord markdown header";
    } else if (blockedWordMatch) {
      violationType = `Posted blocked word/pattern: ${blockedWordMatch.pattern}`;
      isCritical = blockedWordMatch.severity === "critical";
    }

    reason = violationType;

    const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
    const botMember = message.guild.members.me;

    if (!member || !botMember) return;

    const canDeleteMessage = message.channel
      .permissionsFor(botMember)
      ?.has(PermissionsBitField.Flags.ManageMessages);

    const canTimeoutMembers = botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers);

    // Always delete the message
    if (canDeleteMessage && message.deletable) {
      await message.delete().catch(() => null);

      await logAction(message.guild, "messages", {
        author: message.author,
        channel: message.channel ? message.channel.name : "unknown",
        content: message.content || "(no text content)",
        attachments: message.attachments,
        embeds: message.embeds,
        action: "deleted",
        moderator: client.user,
        reason: violationType,
        targetId: message.id,
      }).catch(() => null);
    }

    // Apply timeout for invites/headers (10 min) or critical blocked words (7 days)
    const shouldTimeout =
      (hasInviteLink || hasMarkdownHeader) || (blockedWordMatch && blockedWordMatch.severity === "critical");
    const timeoutDuration = blockedWordMatch && isCritical ? CRITICAL_TIMEOUT_MS : INVITE_TIMEOUT_MS;
    const durationString = blockedWordMatch && isCritical ? "7 days" : "10m";

    if (shouldTimeout && canTimeoutMembers && member.moderatable) {
      await member.timeout(timeoutDuration, reason).catch(() => null);

      await logAction(message.guild, "timeouts", {
        type: "timeout",
        user: message.author,
        moderator: client.user,
        reason,
        targetId: message.author.id,
        duration: durationString,
      }).catch(() => null);
    }
  },
};
