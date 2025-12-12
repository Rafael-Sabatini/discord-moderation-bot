const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");


const JAILED_ROLE_ID = "1245518227648413798";
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
    .setName("jail")
    .setDescription("Apply the JAILED role to a user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to jail")
        .setRequired(true)
    ),
  async execute(interaction) {
    // Permission check: allow bot owner bypass
    const memberRoles = (interaction.member.roles && interaction.member.roles.cache)
      ? Array.from(interaction.member.roles.cache.keys())
      : [];
    const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
    const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;
    if (!hasRolePermission && !isBotOwner) {
      await interaction.reply({ content: "You don't have permission to use this command!", flags: 64 });
      return;
    }
    await interaction.deferReply();
    const user = interaction.options.getUser("user");
    if (!user) {
      await interaction.editReply({ content: "You must specify a user to jail.", flags: 64 });
      return;
    }
    const JailedUser = require("../../database/models/jailedUser");
    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (member.roles.cache.has(JAILED_ROLE_ID)) {
        await interaction.editReply({ content: `${user.tag} is already jailed!` });
        return;
      }
      // Remove all roles except JAILED and @everyone
      const rolesToRemove = member.roles.cache.filter(
        (role) => role.id !== JAILED_ROLE_ID && role.name !== "@everyone"
      );
      if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove);
      }
      await member.roles.add(JAILED_ROLE_ID);
      // Add to DB
      await JailedUser.findOneAndUpdate(
        { userId: user.id, guildId: interaction.guild.id },
        { userId: user.id, guildId: interaction.guild.id, jailedAt: new Date() },
        { upsert: true }
      );
      await interaction.editReply({ content: `JAILED role has been applied to ${user.tag}, and all other roles have been removed.` });
    } catch (error) {
      console.error("Jail command error:", error);
      await interaction.editReply({ content: `There was an error jailing this user! (${error.message})` });
    }
  },
};
