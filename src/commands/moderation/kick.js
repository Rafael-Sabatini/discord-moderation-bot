const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { logAction } = require("../../utils/logging");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
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
    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    if (!interaction.member.permissions.has("KickMembers")) {
      return interaction.reply({
        content: "You don't have permission to kick members!",
        ephemeral: true,
      });
    }

    try {
      await interaction.guild.members.kick(user, reason);

      // Log the kick action
      await logAction(interaction.guild, "KICKS", {
        type: "kick",
        user: user,
        moderator: interaction.user,
        reason: reason,
        targetId: user.id,
      });

      await interaction.reply(
        `Successfully kicked ${user.tag} for reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error trying to kick this user!",
        ephemeral: true,
      });
    }
  },
};
