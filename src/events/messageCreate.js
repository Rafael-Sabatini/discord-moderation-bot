const { logAction } = require("../utils/logging");

// Regex to match CDH links and Discord CDN attachment links
// Matches: 
// - CDH links: https://cdh...
// - Discord CDN: https://cdn.discordapp.com/attachments/...
const CDH_LINK_REGEX = /https?:\/\/(cdh\.|cdn\.discordapp\.com\/attachments\/)/i;

// Trusted role ID
const TRUSTED_ROLE_ID = "1289792051172610049";

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // Check for CDH links in message
    if (CDH_LINK_REGEX.test(message.content)) {
      try {
        // Fetch the member to check their roles
        const member = await message.guild.members.fetch(message.author.id);
        const memberRoles = member.roles.cache;

        // Check if user has trusted role or above
        const hasTrustedRole = memberRoles.has(TRUSTED_ROLE_ID);

        // If user doesn't have trusted role, delete message and DM them
        if (!hasTrustedRole) {
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
            reason: "Blocked CDH image link - user not trusted",
          });

          // Send DM to user with timeout to prevent hanging
          try {
            const dmPromise = message.author.send(
              `⚠️ Your message in **${message.guild.name}** was deleted because it contained an image sharing link (CDH). Image sharing isn't allowed until you are trusted. You can request to be trusted by a moderator.`
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
        }
      } catch (error) {
        // Ignore "Unknown Message" errors (message already deleted)
        if (error.code === 10008) {
          console.warn("[messageCreate] Message was already deleted");
        } else {
          console.error("[messageCreate] Error handling CDH link:", error);
        }
      }
    }
  },
};
