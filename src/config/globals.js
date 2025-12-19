// Global reference to Discord client and other shared resources
let discordClient = null;

function setDiscordClient(client) {
  discordClient = client;
}

function getDiscordClient() {
  return discordClient;
}

module.exports = {
  setDiscordClient,
  getDiscordClient,
};
