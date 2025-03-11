const validateUrl = require("../utils/urlValidator");
const Warning = require("../database/models/warning");
const { logAction } = require("../utils/logging");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.content.match(urlRegex);

    if (!urls) return;

    for (const url of urls) {
      const isValid = await validateUrl(url);

      if (!isValid) {
        try {
          // Store message data before deletion
          const messageData = {
            author: message.author,
            channel: message.channel.name,
            content: message.content,
            attachments: message.attachments,
            embeds: message.embeds,
            urls: urls,
          };

          // Delete message
          await message.delete();

          // Log the deleted message
          await logAction(message.guild, "MESSAGES", messageData);

          // Create warning
          const warning = new Warning({
            userId: message.author.id,
            guildId: message.guild.id,
            moderatorId: client.user.id,
            reason: `Sent suspicious URL: ${url}`,
            timestamp: new Date(),
          });

          await warning.save();

          // Log the warning
          await logAction(message.guild, "WARNS", {
            user: message.author,
            moderator: client.user,
            reason: `Sent suspicious URL: ${url}`,
            targetId: message.author.id,
          });
        } catch (error) {
          console.error("Error handling suspicious URL:", error);
        }
        break;
      }
    }
  },
};
