const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
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
    .setName("kick")
    .setDescription("Kick a user from the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to kick")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the kick")
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
    const reason = interaction.options.getString("reason") || "No reason provided";
    if (!user) {
      return interaction.reply({ content: "You must specify a user to kick.", flags: 64 });
    }
    if (!interaction.member.permissions.has("KickMembers")) {
      return interaction.reply({ content: "You don't have permission to kick members!", flags: 64 });
    }
    await interaction.deferReply();
    try {
      await interaction.guild.members.kick(user, reason);
      // Log the kick action
      await logAction(interaction.guild, "kicks", {
        type: "kick",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });
      await interaction.editReply({ content: `Successfully kicked ${user.tag} for reason: ${reason}` });
    } catch (error) {
      console.error("Kick command error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: `There was an error trying to kick this user! (${error.message})` });
      } else {
        await interaction.reply({ content: `There was an error trying to kick this user! (${error.message})`, flags: 64 });
      }
    }
  },
};
