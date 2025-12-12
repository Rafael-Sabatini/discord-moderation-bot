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
  "1437842615528722535", // Added user
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
    // Permission check: allow bot owner bypass
    const BOT_OWNER_ID = process.env.OWNER_ID || null;
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
      return interaction.reply({ content: "You must specify a user to check warnings for.", flags: 64 });
    }
    await interaction.deferReply();
    try {
      const warnings = await Warning.find({
        userId: user.id,
        guildId: interaction.guild.id,
      }).sort({ timestamp: -1 });
      if (!warnings.length) {
        await interaction.editReply({ content: `${user.tag} has no warnings.` });
        return;
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
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("ViewWarnings command error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "There was an error fetching the warnings!" });
      } else {
        await interaction.reply({ content: "There was an error fetching the warnings!", flags: 64 });
      }
    }
  },
};
