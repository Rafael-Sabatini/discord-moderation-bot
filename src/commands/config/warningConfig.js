const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

// Store thresholds in memory
let thresholds = {
  mute: {
    count: 3,
    duration: 60 * 60 * 1000, // 1 hour in milliseconds
  },
  ban: {
    count: 5,
  },
};

const ALLOWED_ROLES = [
  "1156184281471787068", // Owner
  "1158116870600261712", // Admin
  "1389665074444238960", // Head Moderator
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warningconfig")
    .setDescription("Configure warning thresholds for automated actions")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mutethreshold")
        .setDescription("Set the number of warnings before auto-mute")
        .addIntegerOption((option) =>
          option
            .setName("count")
            .setDescription("Number of warnings before muting")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addIntegerOption(
          (option) =>
            option
              .setName("duration")
              .setDescription("Mute duration in minutes")
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(1440) // 24 hours
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("banthreshold")
        .setDescription("Set the number of warnings before auto-ban")
        .addIntegerOption((option) =>
          option
            .setName("count")
            .setDescription("Number of warnings before banning")
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(15)
        )
    ),

  // Export thresholds for other commands to use
  thresholds,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

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

    if (subcommand === "mutethreshold") {
      const count = interaction.options.getInteger("count");
      const duration = interaction.options.getInteger("duration");

      thresholds.mute.count = count;
      thresholds.mute.duration = duration * 60 * 1000; // Convert minutes to milliseconds

      await interaction.reply({
        content: `Warning threshold for mute updated:\n- Mute after ${count} warnings\n- Mute duration: ${duration} minutes`,
        ephemeral: true,
      });
    } else if (subcommand === "banthreshold") {
      const count = interaction.options.getInteger("count");

      thresholds.ban.count = count;

      await interaction.reply({
        content: `Warning threshold for ban updated:\n- Ban after ${count} warnings`,
        ephemeral: true,
      });
    }
  },
};
