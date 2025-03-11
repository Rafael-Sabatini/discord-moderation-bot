module.exports = async function accountAgeCheck(member, requiredAgeInDays) {
    const accountAgeInDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    return accountAgeInDays >= requiredAgeInDays;
};