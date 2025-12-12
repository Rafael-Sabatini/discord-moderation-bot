const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const JailedUser = require("../../database/models/jailedUser");


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
    .setName("unjail")
    .setDescription("Remove the JAILED role from a user and restore their previous roles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unjail")
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
      await interaction.editReply({ content: "You must specify a user to unjail.", flags: 64 });
      return;
    }
    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (!member.roles.cache.has(JAILED_ROLE_ID)) {
        await interaction.editReply({ content: `${user.tag} is not jailed!` });
        return;
      }
      // Remove JAILED role
      await member.roles.remove(JAILED_ROLE_ID);
      // Remove from DB
      await JailedUser.deleteOne({ userId: user.id, guildId: interaction.guild.id });
      // Restore previous roles if stored (not implemented yet)
      // You can implement role backup/restore logic here
      await interaction.editReply({ content: `JAILED role has been removed from ${user.tag}.` });
    } catch (error) {
      console.error("Unjail command error:", error);
      await interaction.editReply({ content: `There was an error unjailing this user! (${error.message})` });
    }
  },
};
