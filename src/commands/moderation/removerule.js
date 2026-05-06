const { SlashCommandBuilder } = require("discord.js");
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
    .setName("removerule")
    .setDescription("Remove a blocked word rule by ID")
    .addStringOption((option) =>
      option
        .setName("rule_id")
        .setDescription("The ID of the rule to remove")
        .setRequired(true)
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

    const ruleId = interaction.options.getString("rule_id");

    try {
      const result = await BlockedWord.findByIdAndDelete(ruleId);

      if (!result) {
        return interaction.editReply({
          content: "Rule not found. Please check the ID and try again.",
        });
      }

      await interaction.editReply({
        content: `✅ Successfully removed rule:\n**Pattern:** \`${result.pattern}\``,
      });

      // Log the action
      logAction(interaction.guild, "rules", {
        type: "remove_rule",
        moderator: interaction.user,
        pattern: result.pattern,
        severity: result.severity,
        targetId: ruleId,
      }).catch((err) => console.error("Failed to log rule action:", err));
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error trying to remove this rule!",
      });
    }
  },
};
