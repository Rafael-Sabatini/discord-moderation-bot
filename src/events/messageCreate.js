const { PermissionsBitField } = require("discord.js");
const { logAction } = require("../utils/logging");

const DISCORD_INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?discord\.gg\/[A-Za-z0-9-]+/i;
const INVITE_TIMEOUT_MS = 10 * 60 * 1000;

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    if (!DISCORD_INVITE_REGEX.test(message.content || "")) return;

    const reason = "Posted a Discord invite link";
    const member = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
    const botMember = message.guild.members.me;

    if (!member || !botMember) return;

    const canDeleteMessage = message.channel
      .permissionsFor(botMember)
      ?.has(PermissionsBitField.Flags.ManageMessages);

    const canTimeoutMembers = botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers);

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
        reason: "Blocked Discord invite link",
        targetId: message.id,
      }).catch(() => null);
    }

    if (canTimeoutMembers && member.moderatable) {
      await member.timeout(INVITE_TIMEOUT_MS, reason).catch(() => null);

      await logAction(message.guild, "timeouts", {
        type: "timeout",
        user: message.author,
        moderator: client.user,
        reason,
        targetId: message.author.id,
        duration: "10m",
      }).catch(() => null);
    }
  },
};
