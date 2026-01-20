const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");

// No role-based mute — rely on voice-state mute only


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
    .setName("servermute")
    .setDescription("Mute a user in voice channels only")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to mute in voice channels")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName("duration").setDescription("Duration in minutes").setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the mute")
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

    const user = interaction.options.getUser("user");
    if (!user) {
      return interaction.editReply({ content: "You must specify a user to mute in voice channels." });
    }
    const reason = interaction.options.getString("reason") || "No reason provided";
    const duration = interaction.options.getInteger("duration");


    try {
      const member = await interaction.guild.members.fetch(user.id);

      // Ensure the bot has the Mute Members permission
      const me = interaction.guild.members.me;
      if (!me.permissions.has(PermissionFlagsBits.MuteMembers)) {
        return interaction.editReply({ content: "I don't have the 'Mute Members' permission to perform server mutes." });
      }

      // Role hierarchy check: bot must be higher than the target to modify them
      if (me.roles?.highest && member.roles?.highest && me.roles.highest.position <= member.roles.highest.position) {
        return interaction.editReply({ content: `I cannot mute ${user.tag} due to role hierarchy.` });
      }

      // Attempt to set voice mute. Some guilds may not populate voice-state cache for all members
      // so try to mute regardless and handle the error if the user is not in VC.
      try {
        await member.voice.setMute(true, reason);
      } catch (err) {
        console.error(`Failed to voice-mute ${user.tag}:`, err);
        // If the member is not in a voice channel, inform the moderator; otherwise return a generic error
        if (!member.voice || !member.voice.channel) {
          return interaction.editReply({ content: `${user.tag} does not appear to be in a voice channel right now.` });
        }
        return interaction.editReply({ content: `Failed to voice-mute ${user.tag}. Ensure I have the required permissions and role position.` });
      }
      // Send the response immediately
      await interaction.editReply({ content: `Successfully muted ${user.tag} in voice channels for reason: ${reason}${duration ? `\nDuration: ${duration} minutes` : ""}` });
      
      // Log the server mute action asynchronously
      logAction(interaction.guild, "serverMutes", {
        type: "vcMute",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
        duration: duration ? `${duration} minutes` : "Indefinite",
      }).catch((err) => console.error("Failed to log servermute action:", err));
      
      // Schedule unmute if duration is provided
      if (duration) {
        setTimeout(async () => {
          try {
            const refreshedMember = await interaction.guild.members.fetch(user.id);
            if (refreshedMember.voice && refreshedMember.voice.channel) {
              await refreshedMember.voice.setMute(false, "Mute duration expired");
            }
            await logAction(interaction.guild, "serverUnmute", {
              type: "vcUnmute",
              user: user,
              moderator: interaction.client.user,
              reason: "Mute duration expired",
              targetId: user.id,
            });
          } catch (error) {
            console.error(`Failed to unmute ${user.tag} after duration:`, error);
          }
        }, duration * 60 * 1000);
      }
    } catch (error) {
      console.error("Servermute command error:", error);
      await interaction.editReply({ content: "There was an error trying to mute this user in voice channels!" });
    }
  },
};
