const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout (mute) a user")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.BanMembers |
        PermissionFlagsBits.KickMembers |
        PermissionFlagsBits.ModerateMembers
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to timeout")
        .setRequired(true)
    )
    .addIntegerOption(
      (option) =>
        option
          .setName("duration")
          .setDescription("Timeout duration in minutes")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(40320) // 4 weeks in minutes
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const duration = interaction.options.getInteger("duration");
    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id);

    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "You don't have permission to timeout members!",
        ephemeral: true,
      });
    }

    try {
      await member.timeout(duration * 60 * 1000, reason); // Convert minutes to milliseconds
      await interaction.reply(
        `Successfully muted ${user.tag} for ${duration} minutes.\nReason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error trying to timeout this user!",
        ephemeral: true,
      });
    }
  },
};
