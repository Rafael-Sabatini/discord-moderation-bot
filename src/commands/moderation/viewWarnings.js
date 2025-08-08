const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Warning = require("../../database/models/warning");

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
  "1156205959128031333", // Moderator
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a user")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to check warnings for")
        .setRequired(true)
    ),
  async execute(interaction) {
    const memberRoles = interaction.member.roles.cache.map((role) => role.id);
    const hasPermission = ALLOWED_ROLES.some((roleId) =>
      memberRoles.includes(roleId)
    );

    if (!hasPermission) {
      return interaction.reply({
        content: "You don't have permission to use this command!",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");

    try {
      const warnings = await Warning.find({
        userId: user.id,
        guildId: interaction.guild.id,
      }).sort({ timestamp: -1 });

      if (!warnings.length) {
        return interaction.reply({
          content: `${user.tag} has no warnings.`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Warnings for ${user.tag}`)
        .setColor("#FF4444")
        .setDescription(
          warnings
            .map(
              (warn, index) =>
                `**${index + 1}.** ${warn.reason}\n\ud83d\udcc5 <t:${Math.floor(
                  warn.timestamp / 1000
                )}:R>\n\ud83d\udc6e <@${warn.moderatorId}>\n\ud83c\udd94 \`${warn._id}\`\n`
            )
            .join("\n")
        )
        .setFooter({ text: `Total Warnings: ${warnings.length}` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: "There was an error fetching the warnings!",
        });
      } else {
        await interaction.reply({
          content: "There was an error fetching the warnings!",
          ephemeral: true,
        });
      }
    }
  },
};
