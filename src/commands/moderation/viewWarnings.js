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
    .setDescription("View warnings for a user or all warnings in the server")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to check warnings for (leave empty to see all)")
        .setRequired(false)
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
    await interaction.deferReply();
    try {
      let warnings;
      let title;

      if (user) {
        // Get warnings for specific user
        warnings = await Warning.find({
          userId: user.id,
          guildId: interaction.guild.id,
        }).sort({ timestamp: -1 });
        title = `Warnings for ${user.tag}`;
      } else {
        // Get all warnings for the guild
        warnings = await Warning.find({
          guildId: interaction.guild.id,
        }).sort({ timestamp: -1 });
        title = `All Warnings in ${interaction.guild.name}`;
      }

      if (!warnings.length) {
        const message = user ? `${user.tag} has no warnings.` : `No warnings found in this server.`;
        await interaction.editReply({ content: message });
        return;
      }

      // For all warnings, group by user and show a summary first
      if (!user) {
        const userWarningMap = {};
        warnings.forEach((warn) => {
          if (!userWarningMap[warn.userId]) {
            userWarningMap[warn.userId] = [];
          }
          userWarningMap[warn.userId].push(warn);
        });

        const summaryEmbed = new EmbedBuilder()
          .setTitle(title)
          .setColor("#FF4444")
          .setDescription(
            Object.entries(userWarningMap)
              .map(([userId, userWarnings]) => `<@${userId}>: **${userWarnings.length}** warning${userWarnings.length !== 1 ? "s" : ""}`)
              .join("\n")
          )
          .setFooter({ text: `Total Warnings: ${warnings.length}` });

        await interaction.editReply({ embeds: [summaryEmbed] });
        return;
      }

      // For specific user, show detailed warnings
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor("#FF4444")
        .setDescription(
          warnings
            .map(
              (warn, index) =>
                `**${index + 1}.** ${warn.reason}\n📅 <t:${Math.floor(
                  warn.timestamp / 1000
                )}:R>\n👮 <@${warn.moderatorId}>\n🔔 \`${warn._id}\`\n`
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
