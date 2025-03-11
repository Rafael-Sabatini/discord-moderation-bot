require("dotenv").config();

module.exports = {
  name: "guildMemberAdd",
  async execute(client, member) {
    const { guild } = member;
    const accountAgeRequirement =
      parseInt(process.env.ACCOUNT_AGE_REQUIREMENT) || 7; // Default 7 days
    const emailVerificationEnabled =
      process.env.EMAIL_VERIFICATION_ENABLED === "true";

    try {
      // Check account age
      const accountAge = Date.now() - member.user.createdTimestamp;
      const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));

      if (accountAgeDays < accountAgeRequirement) {
        await member.send(
          `Your account must be at least ${accountAgeRequirement} days old to join this server.`
        );
        await member.kick(
          `Account age requirement not met (${accountAgeDays} days)`
        );
        return;
      }

      // Check email verification
      if (emailVerificationEnabled) {
        const emailValid = await emailVerification(member.user.id);
        if (!emailValid) {
          await member.send(
            "Your email is not verified. Please verify your email to access this server."
          );
          await member.kick("Email verification required");
          return;
        }
      }

      // Welcome the member
      const welcomeChannel = guild.channels.cache.find(
        (ch) => ch.name === "welcome"
      );
      if (welcomeChannel) {
        await welcomeChannel.send(
          `Welcome to the server, ${member}! 👋\nPlease read our rules and enjoy your stay!`
        );
      }
    } catch (error) {
      console.error("Error in guildMemberAdd event:", error);
    }
  },
};

// Helper function for email verification
async function emailVerification(userId) {
  // Implement your email verification logic here
  // For example, check against a database
  return true; // Placeholder return
}
