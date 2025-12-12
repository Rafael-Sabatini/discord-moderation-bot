const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Warning = require("../../database/models/warning");


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
    .setName("unwarn")
    .setDescription("Remove a warning from a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove warning from")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("warnid")
        .setDescription("The ID of the warning to remove")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for removing the warning")
        .setRequired(false)
    ),
  async execute(interaction) {
    // Permission check: allow bot owner bypass
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    if (!hasRolePermission && !isBotOwner) {
      return interaction.reply({ content: "You don't have permission to use this command!", flags: 64 });
    }
    const user = interaction.options.getUser("user");
    if (!user) {
      return interaction.reply({ content: "You must specify a user to remove warning from.", flags: 64 });
    }
    const warnId = interaction.options.getString("warnid");
    if (!warnId) {
      return interaction.reply({ content: "You must specify a warning ID to remove.", flags: 64 });
    }
    const reason = interaction.options.getString("reason") || "No reason provided";
    await interaction.deferReply();
    try {
      const warning = await Warning.findOneAndDelete({
        _id: warnId,
        userId: user.id,
        guildId: interaction.guild.id,
      });
      if (!warning) {
        await interaction.editReply({ content: "Warning not found or already removed." });
        return;
      }
      await interaction.editReply({ content: `Successfully removed warning from ${user.tag}. Reason: ${reason}` });
    } catch (error) {
      console.error("Unwarn command error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "Failed to remove the warning." });
      } else {
        await interaction.reply({ content: "Failed to remove the warning.", flags: 64 });
      }
    }
  },
};
