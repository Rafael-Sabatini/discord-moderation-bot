const { PermissionsBitField } = require("discord.js");

function checkModPerms(member) {
  if (!member || !member.permissions) return false;
  try {
    const requiredPermissions = [
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.MuteMembers,
      PermissionsBitField.Flags.ManageRoles,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.Administrator,
    ];
    return requiredPermissions.some((perm) => member.permissions.has(perm));
  } catch (error) {
    console.error(`[PERMS] Error checking moderator permissions:`, error);
    return false;
  }
}

module.exports = checkModPerms;
