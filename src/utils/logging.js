const { EmbedBuilder } = require("discord.js");

// Log channels configuration
const LOG_CHANNELS = {
  WARNS: "mod-warnings",
  BANS: "mod-bans",
  KICKS: "mod-kicks",
  MESSAGES: "message-logs",
};

async function logAction(guild, type, data) {
  try {
    // Get the appropriate log channel
    const channelName = LOG_CHANNELS[type];
    const logChannel = guild.channels.cache.find(
      (ch) => ch.name === channelName
    );

    if (!logChannel) {
      console.error(`Log channel ${channelName} not found!`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `ID: ${data.targetId || "N/A"}` });

    switch (type) {
      case "WARNS":
        embed
          .setColor("#FFA500")
          .setTitle("⚠️ Member Warned")
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "BANS":
        embed
          .setColor(data.type === "ban" ? "#FF0000" : "#00FF00")
          .setTitle(
            data.type === "ban" ? "🔨 Member Banned" : "🔓 Member Unbanned"
          )
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "KICKS":
        embed
          .setColor("#FF6B6B")
          .setTitle("👢 Member Kicked")
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "MESSAGES":
        embed
          .setColor("#FF0000")
          .setTitle("🗑️ Message Deleted")
          .setDescription(
            `**Author:** ${data.author.tag}\n**Channel:** ${data.channel}`
          )
          .addFields({
            name: "Content",
            value: data.content || "No text content",
          });

        // Add attachments field if any
        if (data.attachments?.size > 0) {
          const attachmentsList = Array.from(data.attachments.values())
            .map((att) => `[${att.name}](${att.url})`)
            .join("\n");
          embed.addFields({ name: "Attachments", value: attachmentsList });
        }

        // Add embeds field if any
        if (data.embeds?.length > 0) {
          embed.addFields({
            name: "Embeds",
            value: `Message contained ${data.embeds.length} embed(s)`,
          });
        }

        // Add URLs field if any
        if (data.urls?.length > 0) {
          embed.addFields({
            name: "URLs",
            value: data.urls.join("\n"),
          });
        }
        break;
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error logging action:", error);
  }
}

module.exports = { logAction, LOG_CHANNELS };
