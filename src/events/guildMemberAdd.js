const JAILED_ROLE_ID = "1245518227648413798";
const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
];

module.exports = {
  name: "guildMemberAdd",
  async execute(client, member) {
    const JailedUser = require("../database/models/jailedUser");
    // Only reapply JAILED role if user is in the DB for this guild
    const jailed = await JailedUser.findOne({ userId: member.id, guildId: member.guild.id });
    if (jailed && !member.roles.cache.has(JAILED_ROLE_ID)) {
      await member.roles.add(JAILED_ROLE_ID);
    }
  },
  async handleMemberJoin(member) {
    const { logAction } = require("../utils/logging");
    try {
      // Log member join
      await logAction(member.guild, "memberJoin", {
        user: member.user,
        targetId: member.id,
      });
    } catch (error) {
      console.error("[EVENT] Error in guildMemberAdd:", error);
    }
  }
};
