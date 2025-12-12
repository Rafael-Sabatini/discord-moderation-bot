module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;
    // Note: messageCreate events are no longer logged.
    // Only messageUpdate (edits) and messageDelete are logged.
  },
};
