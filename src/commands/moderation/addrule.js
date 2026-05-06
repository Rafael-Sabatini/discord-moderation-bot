const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const BlockedWord = require("../../database/models/blockedword");
const { logAction } = require("../../utils/logging");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
  "1437842615528722535", // Added user
];
const BOT_OWNER_ID = process.env.OWNER_ID || null;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addrule")
    .setDescription("Add a new blocked word rule")
    .addStringOption((option) =>
      option
        .setName("pattern")
        .setDescription("Regex pattern to block (e.g., badword|anotherbadword)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("severity")
        .setDescription("Severity level of the rule")
        .setRequired(true)
        .addChoices(
          { name: "Critical (7 day timeout)", value: "critical" },
          { name: "Non-Critical (delete only)", value: "non-critical" }
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // Permission check
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;

    if (!hasRolePermission && !isBotOwner) {
      return interaction.editReply({ content: "You don't have permission to use this command!" });
    }

    const pattern = interaction.options.getString("pattern");
    const severity = interaction.options.getString("severity");

    // Validate regex pattern
    try {
      new RegExp(pattern, "i");
    } catch (error) {
      return interaction.editReply({
        content: `Invalid regex pattern: ${error.message}`,
      });
    }

    try {
      const blockedWord = new BlockedWord({
        guildId: interaction.guild.id,
        pattern: pattern,
        severity: severity,
        createdBy: interaction.user.id,
      });

      await blockedWord.save();

      await interaction.editReply({
        content: `✅ Successfully added rule:\n**Pattern:** \`${pattern}\`\n**Severity:** ${severity}`,
      });

      // Log the action
      logAction(interaction.guild, "rules", {
        type: "add_rule",
        moderator: interaction.user,
        pattern: pattern,
        severity: severity,
        targetId: blockedWord._id.toString(),
      }).catch((err) => console.error("Failed to log rule action:", err));
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error trying to add this rule!",
      });
    }
  },
};
