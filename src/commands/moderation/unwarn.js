const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Warning = require("../../database/models/warning");

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
    if (!interaction.member.permissions.has("ModerateMembers")) {
      return interaction.reply({
        content: "You don't have permission to remove warnings!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    const warnId = interaction.options.getString("warnid");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    try {
      const warning = await Warning.findOneAndDelete({
        _id: warnId,
        userId: user.id,
        guildId: interaction.guild.id,
      });

      if (!warning) {
        return interaction.reply({
          content: "Warning not found or already removed.",
          ephemeral: true,
        });
      }

      await interaction.reply(
        `Successfully removed warning from ${user.tag}. Reason: ${reason}`
      );
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "Failed to remove the warning.",
        ephemeral: true,
      });
    }
  },
};
