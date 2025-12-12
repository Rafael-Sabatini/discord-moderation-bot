const { REST, Routes } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Get environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [];
const commandFolders = fs.readdirSync("./src/commands");

for (const folder of commandFolders) {
  const commandFiles = fs
    .readdirSync(`./src/commands/${folder}`)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    try {
      const filePath = path.join(__dirname, "commands", folder, file);
      const command = require(filePath);

      // Validate command structure
      if (!command.data) {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" property.`
        );
        continue;
      }

      if (typeof command.data.toJSON !== "function") {
        console.log(
          `[WARNING] The command at ${filePath} has invalid "data" property. Make sure it's using SlashCommandBuilder.`
        );
        continue;
      }

      commands.push(command.data.toJSON());
      console.log(`✅ Loaded command: ${file}`);
    } catch (error) {
      console.log(`❌ Error loading command ${file}:`, error);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // If a guildId is set, clear that guild's commands first to avoid duplicate commands
    if (guildId) {
      console.log(`Clearing commands for guild ${guildId} to avoid duplicates...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
      });
      console.log(`Cleared guild (${guildId}) commands.`);
    }

    // Deploy commands globally
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log("Successfully reloaded global application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
