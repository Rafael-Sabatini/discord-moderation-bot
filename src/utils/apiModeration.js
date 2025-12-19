const { logAction } = require("./logging");

/**
 * Shared utility function to execute moderation actions
 */
async function executeModerationAction(guild, client, action, params) {
  const { targetUserId, moderatorId, reason, days, duration, channelId, count } = params;

  try {
    // Purge doesn't need user fetching
    if (action === "purge") {
      const moderator = await client.users.fetch(moderatorId);
      return await handlePurge(guild, client, moderator, reason, channelId, count);
    }

    const targetUser = await client.users.fetch(targetUserId);
    const moderator = await client.users.fetch(moderatorId);
    const member = await guild.members.fetch(targetUserId);

    switch (action) {
      case "ban":
        return await handleBan(guild, client, targetUser, moderator, reason, days);
      case "kick":
        return await handleKick(guild, client, targetUser, moderator, reason);
      case "mute":
        return await handleMute(guild, client, member, targetUser, moderator, reason, duration);
      case "unmute":
        return await handleUnmute(guild, client, member, targetUser, moderator, reason);
      case "servermute":
        return await handleServerMute(guild, client, member, targetUser, moderator, reason);
      case "serverunmute":
        return await handleServerUnmute(guild, client, member, targetUser, moderator, reason);
      case "warn":
        return await handleWarn(guild, client, targetUser, moderator, reason);
      case "unban":
        return await handleUnban(guild, client, targetUserId, moderator, reason);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    throw new Error(`Failed to execute ${action}: ${error.message}`);
  }
}

async function handleBan(guild, client, targetUser, moderator, reason, days) {
  const Ban = require("../database/models/ban");
  
  const isPermanent = !days;
  let expiryDate = null;

  if (days) {
    expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  try {
    await targetUser.send(
      `You have been banned from ${guild.name} by ${moderator.tag} for: ${reason}${
        isPermanent ? "" : `\nThis ban will expire on ${expiryDate.toDateString()}.`
      }`
    );
  } catch (dmError) {
    console.log(`[API BAN] Could not DM user ${targetUser.tag}: ${dmError.message}`);
  }

  await guild.members.ban(targetUser, { reason, deleteMessageSeconds: 60 * 60 * 24 * 7 });

  const ban = new Ban({
    userId: targetUser.id,
    guildId: guild.id,
    moderatorId: moderator.id,
    reason: reason,
    banDate: new Date(),
    expiryDate: expiryDate,
    isPermanent: isPermanent,
    isActive: true,
  });
  await ban.save();

  await logAction(guild, "bans", {
    type: "ban",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
    duration: isPermanent ? "Permanent" : `${days} days`,
  });

  return {
    success: true,
    message: `Banned ${targetUser.tag}`,
    ban: ban,
  };
}

async function handleKick(guild, client, targetUser, moderator, reason) {
  await guild.members.kick(targetUser, reason);

  try {
    await targetUser.send(`You have been kicked from ${guild.name} by ${moderator.tag} for: ${reason}`);
  } catch (dmError) {
    console.log(`[API KICK] Could not DM user ${targetUser.tag}: ${dmError.message}`);
  }

  await logAction(guild, "kicks", {
    type: "kick",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
  });

  return {
    success: true,
    message: `Kicked ${targetUser.tag}`,
  };
}

async function handleMute(guild, client, member, targetUser, moderator, reason, duration) {
  const durationMs = duration || 60 * 60 * 1000; // Default 1 hour
  const durationText = formatDuration(durationMs);

  try {
    await targetUser.send(`You have been muted in **${guild.name}** for ${durationText}.\nReason: ${reason}`);
  } catch (dmError) {
    console.log(`[API MUTE] Could not DM user ${targetUser.tag}: ${dmError.message}`);
  }

  await member.timeout(durationMs, reason);

  await logAction(guild, "timeouts", {
    type: "timeout",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
    duration: durationText,
  });

  return {
    success: true,
    message: `Muted ${targetUser.tag} for ${durationText}`,
  };
}

async function handleUnmute(guild, client, member, targetUser, moderator, reason) {
  if (!member.communicationDisabledUntil || member.communicationDisabledUntilTimestamp < Date.now()) {
    throw new Error(`${targetUser.tag} is not currently muted`);
  }

  await member.timeout(null, reason);

  await logAction(guild, "timeouts", {
    type: "timeout removal",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
  });

  return {
    success: true,
    message: `Unmuted ${targetUser.tag}`,
  };
}

async function handleServerMute(guild, client, member, targetUser, moderator, reason) {
  const me = guild.members.me;
  if (!me.permissions.has("MuteMembers")) {
    throw new Error("Bot does not have Mute Members permission");
  }

  if (me.roles?.highest && member.roles?.highest && me.roles.highest.position <= member.roles.highest.position) {
    throw new Error(`Cannot mute ${targetUser.tag} due to role hierarchy`);
  }

  try {
    await member.voice.setMute(true, reason);
  } catch (err) {
    if (!member.voice || !member.voice.channel) {
      throw new Error(`${targetUser.tag} is not in a voice channel`);
    }
    throw err;
  }

  await logAction(guild, "vcMutes", {
    type: "server mute",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
  });

  return {
    success: true,
    message: `Muted ${targetUser.tag} in voice channels`,
  };
}

async function handleServerUnmute(guild, client, member, targetUser, moderator, reason) {
  const me = guild.members.me;
  if (!me.permissions.has("MuteMembers")) {
    throw new Error("Bot does not have Mute Members permission");
  }

  try {
    await member.voice.setMute(false, reason);
  } catch (err) {
    if (!member.voice || !member.voice.channel) {
      throw new Error(`${targetUser.tag} is not in a voice channel`);
    }
    throw err;
  }

  await logAction(guild, "vcMutes", {
    type: "server unmute",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
  });

  return {
    success: true,
    message: `Unmuted ${targetUser.tag} in voice channels`,
  };
}

async function handleWarn(guild, client, targetUser, moderator, reason) {
  const Warning = require("../database/models/warning");
  const { thresholds } = require("../commands/config/warningConfig");

  try {
    await targetUser.send(`You have been warned in ${guild.name} by ${moderator.tag} for: ${reason}`);
  } catch (dmError) {
    console.log(`[API WARN] Could not DM user ${targetUser.tag}: ${dmError.message}`);
  }

  const warning = new Warning({
    userId: targetUser.id,
    guildId: guild.id,
    moderatorId: moderator.id,
    reason: reason,
    timestamp: new Date(),
  });
  await warning.save();

  const warningCount = await Warning.countDocuments({
    userId: targetUser.id,
    guildId: guild.id,
  });

  await logAction(guild, "warnings", {
    type: "warning",
    user: targetUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUser.id,
    warnId: warning._id,
  });

  return {
    success: true,
    message: `Warned ${targetUser.tag}`,
    warning: warning,
    warningCount: warningCount,
  };
}

async function handleUnban(guild, client, targetUserId, moderator, reason) {
  const banInfo = await guild.bans.fetch(targetUserId);
  const bannedUser = banInfo.user;

  await guild.members.unban(targetUserId, reason);

  await logAction(guild, "bans", {
    type: "unban",
    user: bannedUser,
    moderator: moderator,
    reason: reason,
    targetId: targetUserId,
  });

  return {
    success: true,
    message: `Unbanned ${bannedUser.tag}`,
  };
}

async function handlePurge(guild, client, moderator, reason, channelId, count) {
  const channel = await guild.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or is not a text channel");
  }

  const me = guild.members.me;
  if (!me.permissions.has("ManageMessages")) {
    throw new Error("Bot does not have Manage Messages permission");
  }

  const messages = await channel.messages.fetch({ limit: count || 100 });
  const deletableMessages = Array.from(messages.values()).filter(msg => !msg.pinned);

  if (deletableMessages.length === 0) {
    return {
      success: true,
      message: `No messages to purge in ${channel.name}`,
      deletedCount: 0,
    };
  }

  let deletedCount = 0;
  const batchSize = 100; // Discord max for bulk delete

  try {
    // Process messages in batches of up to 100
    for (let i = 0; i < deletableMessages.length; i += batchSize) {
      const batch = deletableMessages.slice(i, i + batchSize);
      
      try {
        await channel.bulkDelete(batch, true);
        deletedCount += batch.length;
      } catch (batchError) {
        console.error(`[PURGE] Error deleting batch starting at index ${i}:`, batchError);
        // If bulk delete fails for this batch, try individual deletion
        for (const msg of batch) {
          try {
            await msg.delete();
            deletedCount++;
          } catch (err) {
            console.error(`[PURGE] Failed to delete individual message ${msg.id}:`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[PURGE] Unexpected error during purge:`, error);
    throw error;
  }

  await logAction(guild, "purges", {
    type: "purge",
    moderator: moderator,
    reason: reason,
    channel: channel,
    deletedCount: deletedCount,
  });

  return {
    success: true,
    message: `Purged ${deletedCount} messages from ${channel.name}`,
    deletedCount: deletedCount,
  };
}

function formatDuration(durationMs) {
  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ") || "0s";
}

module.exports = {
  executeModerationAction,
  formatDuration,
};
