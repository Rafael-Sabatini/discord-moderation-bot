const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove timeout from a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unmute")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for removing the timeout")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "You don't have permission to unmute members!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id);

    try {
      await member.timeout(null, reason); // Setting timeout to null removes it
      await interaction.reply(
        `Successfully unmuted ${user.tag}. Reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Failed to unmute the user.",
        ephemeral: true,
      });
    }
  },
};
