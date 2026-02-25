const { EmbedBuilder } = require("discord.js");

// Log channels configuration
const LOG_CHANNEL_IDS = {
  bans: "1403026353661546647",      // Bans and unbans
  kicks: "1403026353661546647",     // Kicks (TODO: Update to separate channel ID)
  mutes: "1403026389552337040",     // All mutes/unmutes (timeout, servermute, serverunmute)
  warnings: "1403026483974373498",   // Warns and unwarns
  messages: "1403026519118581863",   // Deleted and edited messages
  purged: "1451999307531157757",     // Purged messages transcript
};

async function logAction(guild, type, data) {
  try {
    // Map action types to log channels
    let channelType = type;
    
    // Route mute-related actions to unified mutes channel
    if (type === "timeouts" || type === "vcMutes" || type === "serverMutes" || type === "serverUnmute") {
      channelType = "mutes";
    }
    
    // Route unbans to bans channel
    if (type === "unbans") {
      channelType = "bans";
    }

    // Get the appropriate log channel ID
    let channelId = LOG_CHANNEL_IDS[channelType];
    let logChannel;

    if (channelId) {
      logChannel = guild.channels.cache.get(channelId);
    }

    // Fallback: try to find a channel by conventional name when no ID configured or channel not found
    if (!logChannel) {
      logChannel = guild.channels.cache.find((ch) => ch.name === channelType || ch.name === `${channelType}`);
      if (!logChannel) {
        console.error(`[LOGGING] Channel for type '${type}' (mapped to '${channelType}') not found (ID: ${channelId || 'none'})`);
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
        
      case "kicks":
        embed
          .setColor("#FF8800")
          .setTitle("👢 Member Kicked")
          .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        break;
        
      // All mute types - different embeds based on data.type
      case "timeouts":
        if (data.type === "timeout removal") {
          embed
            .setColor("#6BFF6B")
            .setTitle("🔊 Member Unmuted")
            .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}`)
            .addFields({ name: "Moderator", value: data.moderator.tag });
        } else {
          embed
            .setColor("#FF6B6B")
            .setTitle("⏳ Member Muted")
            .setDescription(`**Member:** ${data.user.tag}\n**Reason:** ${data.reason}\n**Duration:** ${data.duration}`)
            .addFields({ name: "Moderator", value: data.moderator.tag });
        }
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
          .setTitle("🔇 Member Server Muted")
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
        const isSuspiciousLink = data.reason === "Blocked Discord CDN link";
        embed
          .setColor(data.action === "deleted" ? "#FF0000" : "#FFA500")
          .setTitle(data.action === "deleted" ? (isSuspiciousLink ? "🔗 Suspicious Link Deleted" : "🗑️ Message Deleted") : "✏️ Message Updated")
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
        // Create main embed
        embed
          .setColor("#8B0000")
          .setTitle("🗑️ Messages Purged")
          .setDescription(`**Channel:** ${data.channel.name}\n**Messages Deleted:** ${data.deletedCount}\n**Reason:** ${data.reason || "No reason provided"}`)
          .addFields({ name: "Moderator", value: data.moderator.tag });
        
        await logChannel.send({ embeds: [embed] });
        
        // Create transcript if messages were provided
        if (data.messages && data.messages.length > 0) {
          const transcript = data.messages.map((msg, index) => {
            const timestamp = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "Unknown time";
            const author = msg.author || "Unknown user";
            const content = msg.content || "(no content)";
            const attachments = msg.attachments && msg.attachments.length > 0 
              ? `\n📎 Attachments: ${msg.attachments.join(", ")}` 
              : "";
            return `[${timestamp}] ${author}: ${content}${attachments}`;
          }).join("\n\n");
          
          // Split transcript into chunks if too long (Discord has 2000 char limit)
          const maxLength = 1900;
          if (transcript.length <= maxLength) {
            await logChannel.send({ content: `**Transcript:**\n\`\`\`\n${transcript}\n\`\`\`` });
          } else {
            // Split into multiple messages
            const chunks = [];
            let currentChunk = "";
            const lines = transcript.split("\n\n");
            
            for (const line of lines) {
              if ((currentChunk + line).length > maxLength) {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = line;
              } else {
                currentChunk += (currentChunk ? "\n\n" : "") + line;
              }
            }
            if (currentChunk) chunks.push(currentChunk);
            
            for (let i = 0; i < chunks.length; i++) {
              await logChannel.send({ 
                content: `**Transcript (${i + 1}/${chunks.length}):**\n\`\`\`\n${chunks[i]}\n\`\`\`` 
              });
            }
          }
        }
        return; // Early return since we already sent the embed
    }
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[LOGGING] Error logging action:`, error);
  }
}

module.exports = { logAction };
