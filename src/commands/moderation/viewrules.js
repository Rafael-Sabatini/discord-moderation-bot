const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const BlockedWord = require("../../database/models/blockedword");

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
    .setName("viewrules")
    .setDescription("View all blocked word rules for this server"),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const rules = await BlockedWord.find({ guildId: interaction.guild.id }).sort({
        createdAt: -1,
      });

      if (rules.length === 0) {
        return interaction.editReply({
          content: "No blocked word rules have been set up yet.",
        });
      }

      // Create embeds for rules (Discord has a 4096 character limit per embed)
      const embeds = [];
      let currentEmbed = new EmbedBuilder()
        .setTitle("Blocked Word Rules")
        .setColor("#FF0000")
        .setTimestamp();

      let fieldCount = 0;
      let currentText = "";

      for (const rule of rules) {
        const ruleText = `**ID:** \`${rule._id}\`\n**Pattern:** \`${rule.pattern}\`\n**Severity:** ${rule.severity}`;

        if ((currentText + ruleText).length > 4000 || fieldCount >= 25) {
          if (currentText) {
            currentEmbed.addFields({
              name: `Rule ${fieldCount}`,
              value: currentText,
              inline: false,
            });
          }
          embeds.push(currentEmbed);
          currentEmbed = new EmbedBuilder()
            .setTitle("Blocked Word Rules (continued)")
            .setColor("#FF0000")
            .setTimestamp();
          currentText = ruleText;
          fieldCount = 1;
        } else {
          if (currentText) {
            currentText += "\n\n";
          }
          currentText += ruleText;
          fieldCount++;
        }
      }

      if (currentText) {
        currentEmbed.addFields({
          name: `Rule ${fieldCount}`,
          value: currentText,
          inline: false,
        });
        embeds.push(currentEmbed);
      }

      await interaction.editReply({
        embeds: embeds.slice(0, 10), // Discord has a 10 embed limit per message
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error trying to retrieve the rules!",
      });
    }
  },
};
