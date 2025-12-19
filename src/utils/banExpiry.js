const Ban = require("../database/models/ban");
const { getDiscordClient } = require("../config/globals");

/**
 * Check for expired temporary bans and unban users
 * This function should be called periodically (e.g., every hour)
 */
async function checkExpiredBans() {
  try {
    const now = new Date();
    
    // Find all active temporary bans that have expired
    const expiredBans = await Ban.find({
      isActive: true,
      isPermanent: false,
      expiryDate: { $lte: now },
    });

    if (expiredBans.length === 0) {
      return;
    }

    const client = getDiscordClient();
    if (!client || !client.isReady()) {
      console.log(`[BAN EXPIRY] Discord client not ready, skipping ban expiration check`);
      return;
    }

    console.log(`[BAN EXPIRY] Found ${expiredBans.length} expired ban(s) to process`);

    for (const ban of expiredBans) {
      try {
        const guild = await client.guilds.fetch(ban.guildId);
        const user = await client.users.fetch(ban.userId);

        // Attempt to unban the user
        try {
          await guild.members.unban(ban.userId, `Temporary ban expired (${ban.expiryDate.toDateString()})`);
          console.log(`[BAN EXPIRY] Successfully unbanned ${user.tag} from ${guild.name}`);
        } catch (unbanError) {
          console.error(`[BAN EXPIRY] Failed to unban ${user.tag} from ${guild.name}:`, unbanError.message);
        }

        // Send DM to the user notifying them they've been unbanned
        if (!ban.dmSentOnExpiry) {
          try {
            const inviteUrl = await guild.invites.create(guild.systemChannel || guild.channels.cache.find(ch => ch.isTextBased()), {
              maxAge: 604800, // 7 days
              maxUses: 1,
              temporary: false,
            });

            await user.send(
              `Your temporary ban from **${guild.name}** has expired and you are now unbanned!\n\nYou can rejoin the server here: ${inviteUrl.url}`
            );
            console.log(`[BAN EXPIRY] Sent re-invite DM to ${user.tag}`);
          } catch (dmError) {
            console.log(`[BAN EXPIRY] Could not send re-invite DM to ${user.tag}:`, dmError.message);
          }
        }

        // Update ban record to mark it as inactive and DM sent
        ban.isActive = false;
        ban.dmSentOnExpiry = true;
        await ban.save();
      } catch (error) {
        console.error(`[BAN EXPIRY] Error processing ban for user ${ban.userId}:`, error.message);
        // Continue to next ban instead of breaking
      }
    }
  } catch (error) {
    console.error(`[BAN EXPIRY] Error checking expired bans:`, error);
  }
}

/**
 * Start the background task to check for expired bans periodically
 * Runs every 30 minutes
 */
function startBanExpiryCheck() {
  // Run immediately on startup
  checkExpiredBans();

  // Then run every 30 minutes
  setInterval(() => {
    checkExpiredBans();
  }, 30 * 60 * 1000);

  console.log("[BAN EXPIRY] Background ban expiry checker started (checks every 30 minutes)");
}

module.exports = {
  checkExpiredBans,
  startBanExpiryCheck,
};
