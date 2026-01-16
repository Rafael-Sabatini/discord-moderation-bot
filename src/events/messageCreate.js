const { logAction } = require("../utils/logging");

// Regex to match Discord CDN attachment links
const DISCORD_CDN_LINK_REGEX = /https:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/[^\s]+/gi;

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // Check for Discord CDN links
    if (DISCORD_CDN_LINK_REGEX.test(message.content)) {
      try {
        // Log the message before deletion
        await logAction(message.guild, "messages", {
          action: "deleted",
          author: message.author,
          channel: message.channel.name,
          content: message.content,
          attachments: message.attachments,
          embeds: message.embeds,
          reason: "Blocked Discord CDN link",
        });

        // Delete the message
        await message.delete();

        // Send DM to user
        try {
          await message.author.send(
            `⚠️ Your message in **${message.guild.name}** was deleted because it contained a suspicious link. Please avoid sharing Discord CDN attachment links.`
          );
        } catch (dmError) {
          console.warn("[messageCreate] Could not send DM to user:", dmError.message);
        }
      } catch (error) {
        console.error("[messageCreate] Error handling Discord CDN link:", error);
      }
    }
  },
};
