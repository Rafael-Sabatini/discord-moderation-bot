const { PermissionsBitField } = require("discord.js");

function checkModPerms(member) {
  const requiredPermissions = [
    PermissionsBitField.Flags.BanMembers,
    PermissionsBitField.Flags.KickMembers,
  ];

  return requiredPermissions.every((perm) => member.permissions.has(perm));
}

module.exports = checkModPerms;
