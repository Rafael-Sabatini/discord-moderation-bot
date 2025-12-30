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
    .setName("serverunmute")
    .setDescription("Unmute a user in voice channels")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unmute in voice channels")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the unmute")
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
      return interaction.reply({ content: "You must specify a user to unmute in voice channels.", flags: 64 });
    }
    const reason = interaction.options.getString("reason") || "No reason provided";

    try {
      const member = await interaction.guild.members.fetch(user.id);
      // Attempt to unmute if in voice channel
      try {
        if (member.voice && member.voice.channel) {
          await member.voice.setMute(false, reason);
        }
      } catch (err) {
        console.error(`Failed to voice-unmute ${user.tag}:`, err);
      }
      // Log the unmute action
      await logAction(interaction.guild, "serverUnmute", {
        type: "serverUnmute",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });
      await interaction.reply({ content: `Successfully removed server mute for ${user.tag}. Reason: ${reason}` });
    } catch (error) {
      console.error("Serverunmute command error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "There was an error trying to unmute this user in voice channels!" });
      } else {
        await interaction.reply({ content: "There was an error trying to unmute this user in voice channels!", flags: 64 });
      }
    }
  },
};
