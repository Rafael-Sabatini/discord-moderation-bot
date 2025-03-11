module.exports = {
  data: {
    name: 'setAccountAge',
    description: 'Set the required account age for users to access the server.',
    options: [
      {
        type: 'INTEGER',
        name: 'age',
        description: 'The required account age in days',
        required: true,
      },
    ],
  },
  async execute(interaction) {
    const requiredAge = interaction.options.getInteger('age');

    // Here you would typically save the required age to your database or configuration
    // For demonstration, we'll just reply with a confirmation message
    await interaction.reply(`The required account age has been set to ${requiredAge} days.`);
  },
};