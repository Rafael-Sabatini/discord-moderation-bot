module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // Event handler for message creation
    // Add custom message handling logic here if needed
  },
};
