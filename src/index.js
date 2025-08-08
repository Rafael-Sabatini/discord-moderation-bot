const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Validate environment variables
const token = process.env.TOKEN;
const mongoUri = process.env.MONGODB_URI;

// if (!token || !mongoUri) {
//   console.error("Missing required environment variables!");
//   process.exit(1);
// }



const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const commandFolders = fs.readdirSync("./src/commands");

(async () => {
  // Connect to MongoDB
  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }

  // Load commands
  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`./src/commands/${folder}`)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      try {
        const command = require(`./commands/${folder}/${file}`);
        if (!command.data || !command.data.name) {
          console.log(
            `[WARNING] The command at ${folder}/${file} is missing required "data" property.`
          );
          continue;
        }
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } catch (error) {
        console.log(`❌ Error loading command ${file}:`, error);
      }
    }
  }

  // Load events
  const eventFiles = fs
    .readdirSync("./src/events")
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    try {
      const event = require(`./events/${file}`);
      client.on(event.name, (...args) => event.execute(client, ...args));
      console.log(`✅ Loaded event: ${event.name}`);
    } catch (error) {
      console.log(`❌ Error loading event ${file}:`, error);
    }
  }

  // Handle interactions
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {

      // Allow only specific roles to use commands
      const ALLOWED_ROLES = [
        "1156184281471787068", // Owner
        "1158116870600261712", // Admin
        "1389665074444238960", // Head Moderator
        "1156205959128031333", // Moderator
      ];
      const memberRoles = interaction.member.roles.cache.map((role) => role.id);
      const hasPermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
      if (!hasPermission) {
        return interaction.reply({
          content: "You don't have permission to use this command!",
          ephemeral: true,
        });
      }

      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error executing this command!",
        ephemeral: true,
      });
    }
  });

  // Login
  try {
    await client.login(token);
    console.log(`✅ ${client.user.tag} is online!`);
  } catch (error) {
    console.error("Failed to login:", error);
    process.exit(1);
  }
})();

// Handle process errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});
