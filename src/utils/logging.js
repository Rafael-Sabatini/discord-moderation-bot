const { EmbedBuilder } = require("discord.js");

// Log channels configuration
const LOG_CHANNEL_IDS = {
  bans: "1403026353661546647",
  kicks: "1403026353661546647",
  timeouts: "1403026389552337040",
  vcMutes: "1403026443612586062",
  serverMutes: "1403026443612586062",
  warnings: "1403026483974373498",
  messages: "1403026519118581863", // Updated for deleted/edited messages
  purged: "1451999307531157757", // Purged/bulk deleted messages
};

async function logAction(guild, type, data) {
  try {
    // Get the appropriate log channel ID
    let channelId = LOG_CHANNEL_IDS[type];
    let logChannel;

    if (channelId) {
      logChannel = guild.channels.cache.get(channelId);
    }

    // Fallback: try to find a channel by conventional name when no ID configured or channel not found
    if (!logChannel) {
      const fallbackName = type === "serverMutes" || type === "serverUnmute" ? "server-mutes" : type;
      logChannel = guild.channels.cache.find((ch) => ch.name === fallbackName || ch.name === `${fallbackName}`);
      if (!logChannel) {
        console.error(`[LOGGING] Channel for type '${type}' not found (ID: ${channelId || 'none'}, name: '${fallbackName}')`);
        return;
      }
    }

    const embed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `ID: ${data.targetId || "N/A"}` });

    switch (type) {
      case "warnings":
        if (data.type === "unwarn") {
          embed
            .setColor("#90EE90")
            .setTitle("✅ Warning Removed")
            .setDescription(`**Member:** ${data.user.tag}\n**Warning ID:** ${data.warnId}`)
            .addFields({ name: "Moderator", value: data.moderator.tag });
        } else {
          embed
            .setColor("#FFA500")
            .setTitle("⚠️ Member Warned")
            .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}\n**Warning ID:** ${data.warnId}`)
            .addFields({ name: "Moderator", value: data.moderator.tag });
        }
        break;
      case "bans":
        embed
          .setColor("#FF0000")
          .setTitle("🔨 Member Banned")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields(
            { name: "Moderator", value: data.moderator.tag },
            { name: "Ban Type", value: data.duration || "Permanent" }
          );
        break;
      case "unbans":
        embed
          .setColor("#00AA00")
          .setTitle("✅ Member Unbanned")
          .setDescription(`**Member:** ${data.user.tag}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "jail":
        embed
          .setColor("#8B4513")
          .setTitle("🔒 Member Jailed")
          .setDescription(`**Member:** ${data.user.tag}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "unjail":
        embed
          .setColor("#90EE90")
          .setTitle("🔓 Member Released from Jail")
          .setDescription(`**Member:** ${data.user.tag}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "kicks":
        embed
          .setColor("#FF8800")
          .setTitle("👢 Member Kicked")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "timeouts":
        embed
          .setColor("#FF6B6B")
          .setTitle("⏳ Member Muted (Timed Out)")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}\n**Duration:** ${data.duration}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "timeout removal":
        embed
          .setColor("#6BFF6B")
          .setTitle("🔊 Member Unmuted (Timeout Removed)")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "vcMutes":
        embed
          .setColor("#FF4444")
          .setTitle("🔇 Member Server Muted (Voice)")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "serverMutes":
        embed
          .setColor("#FF4444")
          .setTitle("🔇 Member Server Muted (Role)")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "serverUnmute":
        embed
          .setColor("#6BFF6B")
          .setTitle("🔊 Member Server Unmuted")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
      case "messages":
        embed
          .setColor(data.action === "deleted" ? "#FF0000" : "#FFA500")
          .setTitle(data.action === "deleted" ? "🗑️ Message Deleted" : "✏️ Message Updated")
          .setDescription(`**Author:** ${data.author.tag}\n**Channel:** ${data.channel}`)
          .addFields({
            name: "Content",
            value: (data.content && data.content.length > 1024)
              ? data.content.slice(0, 1021) + '...'
              : (data.content || "No text content"),
          });
        if (data.moderator) {
          embed.addFields({ name: "Deleted By", value: data.moderator.tag });
        }
        if (data.action === "updated" && data.newContent) {
          embed.addFields({
            name: "Updated Content",
            value: (data.newContent.length > 1024)
              ? data.newContent.slice(0, 1021) + '...'
              : data.newContent,
          });
        }
        if (data.attachments?.size > 0) {
          let attachmentsList = Array.from(data.attachments.values())
            .map((att) => `[${att.name}](${att.url})`)
            .join("\n");
          if (attachmentsList.length > 1024) {
            attachmentsList = attachmentsList.slice(0, 1021) + '...';
          }
          embed.addFields({ name: "Attachments", value: attachmentsList });
          
          // Try to embed the first image/GIF
          const firstAttachment = data.attachments.first();
          if (firstAttachment && firstAttachment.contentType?.startsWith("image")) {
            embed.setImage(firstAttachment.url);
          }
        }
        if (data.embeds?.length > 0) {
          // Check if any embeds have images (GIFs, images from links, etc.)
          const imageEmbed = data.embeds.find((e) => e.image || e.thumbnail);
          if (imageEmbed && (imageEmbed.image || imageEmbed.thumbnail)) {
            embed.setImage(imageEmbed.image?.url || imageEmbed.thumbnail?.url);
          } else {
            embed.addFields({
              name: "Embeds",
              value: `Message contained ${data.embeds.length} embed(s)`,
            });
          }
        }
        break;
      case "purged":
        embed
          .setColor("#8B0000")
          .setTitle("🗑️ Messages Purged")
          .setDescription(`**Channel:** ${data.channel.name}\n**Messages Deleted:** ${data.deletedCount}\n**Reason:** ${data.reason || "No reason provided"}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
    }
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[LOGGING] Error logging action:`, error);
  }
}

module.exports = { logAction };
