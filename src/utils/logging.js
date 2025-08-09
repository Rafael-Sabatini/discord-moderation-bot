const { EmbedBuilder } = require("discord.js");

// Log channels configuration
const LOG_CHANNEL_IDS = {
  bans: "1403026353661546647",
  timeouts: "1403026389552337040",
  vcMutes: "1403026443612586062",
  warnings: "1403026483974373498",
  messages: "1403026519118581863", // Updated for deleted/edited messages
};

async function logAction(guild, type, data) {
  try {
    // Get the appropriate log channel ID
    const channelId = LOG_CHANNEL_IDS[type];

    if (!channelId) {
      console.error(`Log channel ID for type '${type}' is undefined!`);
      return;
    }

    const logChannel = guild.channels.cache.get(channelId);

    if (!logChannel) {
      console.error(`Log channel with ID ${channelId} not found or inaccessible!`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `ID: ${data.targetId || "N/A"}` });

    switch (type) {
      case "warnings":
        embed
          .setColor("#FFA500")
          .setTitle("⚠️ Member Warned")
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}\n**Warning ID:** ${data.warnId}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "bans":
        embed
          .setColor("#FF0000")
          .setTitle("🔨 Member Banned")
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "timeouts":
        embed
          .setColor("#FF6B6B")
          .setTitle("⏳ Member Timed Out")
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}\n**Duration:** ${data.duration}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "vcMutes":
        embed
          .setColor("#FF4444")
          .setTitle("🔇 Member Server Muted")
          .setDescription(
            `**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`
          )
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;

      case "messages":
        embed
          .setColor(data.action === "deleted" ? "#FF0000" : "#FFA500")
          .setTitle(
            data.action === "deleted"
              ? "🗑️ Message Deleted"
              : "✏️ Message Updated"
          )
          .setDescription(
            `**Author:** ${data.author.tag}\n**Channel:** ${data.channel}`
          )
          .addFields({
            name: "Content",
            value: data.content || "No text content",
          });

        if (data.action === "updated" && data.newContent) {
          embed.addFields({
            name: "Updated Content",
            value: data.newContent,
          });
        }

        if (data.attachments?.size > 0) {
          const attachmentsList = Array.from(data.attachments.values())
            .map((att) => `[${att.name}](${att.url})`)
            .join("\n");
          embed.addFields({ name: "Attachments", value: attachmentsList });
        }

        if (data.embeds?.length > 0) {
          embed.addFields({
            name: "Embeds",
            value: `Message contained ${data.embeds.length} embed(s)`,
          });
        }
        break;
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error logging action:", error);
  }
}

module.exports = { logAction };
