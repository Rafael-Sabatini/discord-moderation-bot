const { logAction } = require("../utils/logging");

// Regex to match Discord CDN attachment links with suspicious file names
// Matches: numeric filenames (e.g., 123456.jpg) or IMG_XXXX filenames (e.g., IMG_5545.png)
const DISCORD_CDN_LINK_REGEX = /https:\/\/cdn\.discordapp\.com\/attachments\/\d+\/\d+\/(?:\d+|IMG_\d+)\.(?:jpg|png|jpeg|gif)(?:\?|$)/i;

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // Check for Discord CDN links
    if (DISCORD_CDN_LINK_REGEX.test(message.content)) {
      try {
        const messageContent = message.content;
        const messageAuthor = message.author;
        const messageChannel = message.channel.name;
        const messageAttachments = message.attachments;
        const messageEmbeds = message.embeds;

        // Delete the message first
        await message.delete();

        // Log the message after deletion to prevent duplicate logs
        await logAction(message.guild, "messages", {
          action: "deleted",
          author: messageAuthor,
          channel: messageChannel,
          content: messageContent,
          attachments: messageAttachments,
          embeds: messageEmbeds,
          reason: "Blocked Discord CDN link",
        });

        // Send DM to user with timeout to prevent hanging
        try {
          const dmPromise = message.author.send(
            `⚠️ Your message in **${message.guild.name}** was deleted because it contained a suspicious link. Please avoid sharing Discord CDN attachment links.`
          );
          // Set a 5-second timeout for DM sending
          await Promise.race([
            dmPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("DM send timeout")), 5000)
            )
          ]);
        } catch (dmError) {
          console.warn("[messageCreate] Could not send DM to user:", dmError.message);
        }
      } catch (error) {
        // Ignore "Unknown Message" errors (message already deleted)
        if (error.code === 10008) {
          console.warn("[messageCreate] Message was already deleted");
        } else {
          console.error("[messageCreate] Error handling Discord CDN link:", error);
        }
      }
    }
  },
};
