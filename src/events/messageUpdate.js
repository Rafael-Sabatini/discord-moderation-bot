const { logAction } = require("../utils/logging");

module.exports = {
  name: "messageUpdate",
  async execute(client, oldMessage, newMessage) {
    if (oldMessage.author.bot || !oldMessage.guild) return;

    try {
      const messageData = {
        author: oldMessage.author,
        channel: `<#${oldMessage.channel.id}>`, // Link to the channel
        content: oldMessage.content,
        newContent: newMessage.content,
        attachments: oldMessage.attachments,
        embeds: oldMessage.embeds,
        action: "updated", // Specify the action type
      };

      // Log the updated message
      await logAction(oldMessage.guild, "messages", messageData);
    } catch (error) {
      console.error("Error logging updated message:", error);
    }
  },
};
