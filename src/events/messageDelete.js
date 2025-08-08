const { logAction } = require("../utils/logging");

module.exports = {
  name: "messageDelete",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    try {
      const messageData = {
        author: message.author,
        channel: `<#${message.channel.id}>`, // Link to the channel
        content: message.content,
        attachments: message.attachments,
        embeds: message.embeds,
        action: "deleted", // Specify the action type
      };

      // Log the deleted message
      await logAction(message.guild, "messages", messageData);
    } catch (error) {
      console.error("Error logging deleted message:", error);
    }
  },
};
