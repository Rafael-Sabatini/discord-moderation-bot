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
    .setName("ban")
    .setDescription("Ban a user from the server")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to ban").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(true)
    ),
  async execute(interaction) {
    // Permission check: allow bot owner bypass
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    if (!hasRolePermission && !isBotOwner) {
      return interaction.reply({
        content: "You don't have permission to use this command!",
        flags: 64,
      });
    }

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    if (!user) {
      return interaction.reply({ content: "You must specify a user to ban.", flags: 64 });
    }
    if (!interaction.member.permissions.has("BanMembers")) {
      return interaction.reply({ content: "You don't have permission to ban members!", flags: 64 });
    }
    await interaction.deferReply();
    try {
      // DM the user about the ban
      try {
        await user.send(`You have been banned from ${interaction.guild.name} by ${interaction.user.tag} for: ${reason}`);
      } catch (dmError) {
        // Ignore DM errors (user may have DMs off)
      }
      // Delete up to 7 days of messages using Discord's built-in option
      await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: 60 * 60 * 24 * 7 });
      // Log the ban action immediately
      await logAction(interaction.guild, "bans", {
        type: "ban",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });
      await interaction.editReply({ content: `Successfully banned ${user.tag} for reason: ${reason}\nTheir messages from the last 7 days have been deleted.` });
    } catch (error) {
      console.error("Ban command error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: `There was an error trying to ban this user! (${error.message})` });
      } else {
        await interaction.reply({ content: `There was an error trying to ban this user! (${error.message})`, flags: 64 });
      }
    }
  },
};
