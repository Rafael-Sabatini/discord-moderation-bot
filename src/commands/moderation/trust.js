const { SlashCommandBuilder } = require("discord.js");
const { logAction } = require("../../utils/logging");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
  "1437842615528722535", // Added user
];
const BOT_OWNER_ID = process.env.OWNER_ID || null;
const TRUSTED_ROLE_ID = "1289792051172610049";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trust")
    .setDescription("Apply the trusted member role to one or more users")
    .addUserOption((option) =>
      option
        .setName("user1")
        .setDescription("The first user to trust")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user2")
        .setDescription("The second user to trust (optional)")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("user3")
        .setDescription("The third user to trust (optional)")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("user4")
        .setDescription("The fourth user to trust (optional)")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("user5")
        .setDescription("The fifth user to trust (optional)")
        .setRequired(false)
    ),
  async execute(interaction) {
    // Defer reply immediately to prevent interaction timeout
    await interaction.deferReply();

    // Permission check: allow bot owner bypass
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    if (!hasRolePermission && !isBotOwner) {
      return interaction.editReply({ content: "You don't have permission to use this command!" });
    }

    // Collect all users from options
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const user = interaction.options.getUser(`user${i}`);
      if (user) {
        users.push(user);
      }
    }

    if (users.length === 0) {
      return interaction.editReply({ content: "You must specify at least one user to trust." });
    }

    // Check if bot has permission to manage roles
    if (!interaction.guild.members.me.permissions.has("ManageRoles")) {
      return interaction.editReply({ content: "I don't have permission to manage roles!" });
    }

    const results = {
      success: [],
      failed: [],
    };

    // Apply the trusted role to each user
    for (const user of users) {
      try {
        const member = await interaction.guild.members.fetch(user.id);
        const role = await interaction.guild.roles.fetch(TRUSTED_ROLE_ID);

        if (!role) {
          results.failed.push({ user: user.tag, reason: "Trusted role not found" });
          continue;
        }

        await member.roles.add(role);
        results.success.push(user.tag);
      } catch (error) {
        console.error(`Error trusting user ${user.tag}:`, error);
        results.failed.push({ user: user.tag, reason: error.message });
      }
    }

    // Build response message
    let responseMessage = "**Trust Command Results:**\n";

    if (results.success.length > 0) {
      responseMessage += `✅ Successfully trusted: ${results.success.join(", ")}\n`;
    }

    if (results.failed.length > 0) {
      responseMessage += `❌ Failed to trust:\n`;
      results.failed.forEach((fail) => {
        responseMessage += `  - ${fail.user}: ${fail.reason}\n`;
      });
    }

    await interaction.editReply(responseMessage);

    // Log the trust action asynchronously
    logAction(interaction.guild, "trust", {
      type: "trust",
      moderator: interaction.user,
      users: results.success,
      failed: results.failed,
    }).catch((err) => console.error("Failed to log trust action:", err));
  },
};
