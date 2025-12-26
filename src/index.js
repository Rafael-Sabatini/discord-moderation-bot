const { Client, GatewayIntentBits, Collection } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Production mode detection
const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

console.log(`[BOT] Starting in ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} mode`);

const token = process.env.TOKEN;
const mongoUri = process.env.MONGODB_URI;
if (!token || !mongoUri) {
  console.error("Missing required environment variables!");
  process.exit(1);
}

// Import server setup and utilities
const { setDiscordClient: setServerDiscordClient } = require("./server");
const { setDiscordClient: setGlobalsDiscordClient } = require("./config/globals");
const { startBanExpiryCheck } = require("./utils/banExpiry");

// Deploy commands
function deployCommands() {
  console.log("📝 Deploying Discord commands...");
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const deploy = spawn("node", [path.join(__dirname, "deploy-commands.js")], {
      stdio: "inherit",
    });

    deploy.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Commands deployed successfully");
        resolve();
      } else {
        console.warn(`⚠️  Command deployment exited with code ${code}`);
        resolve(); // Don't reject to allow bot to continue
      }
    });

    deploy.on("error", (err) => {
      console.error("❌ Failed to deploy commands:", err);
      resolve(); // Don't reject to allow bot to continue
    });
  });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Load commands
const commandFolders = fs.readdirSync("./src/commands");

async function loadCommands() {
  for (const folder of commandFolders) {
    const commandFiles = fs
      .readdirSync(`./src/commands/${folder}`)
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      try {
        const command = require(`./commands/${folder}/${file}`);
        if (!command.data || !command.data.name) {
          console.warn(`[WARNING] The command at ${folder}/${file} is missing required "data" property.`);
          continue;
        }
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
      } catch (error) {
        console.error(`Error loading command ${file}:`, error);
      }
    }
  }
}

async function loadEvents() {
  const eventFiles = fs.readdirSync("./src/events").filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    try {
      const event = require(`./events/${file}`);
      client.on(event.name, (...args) => event.execute(client, ...args));
      console.log(`Loaded event: ${event.name}`);
    } catch (error) {
      console.error(`Error loading event ${file}:`, error);
    }
  }
}

async function startBot() {
  try {
    // Deploy commands first
    await deployCommands();

    // Connect to MongoDB and start Discord bot
    await mongoose.connect(mongoUri, {
      dbName: 'discord'
    });
    console.log("✅ Connected to MongoDB - discord database");
    
    await loadCommands();
    await loadEvents();
    await client.login(token);
  } catch (error) {
    console.error("❌ Startup error:", error);
    process.exit(1);
  }
}

// Add ready event listener
client.on("ready", () => {
  console.log(`✅ ${client.user.tag} is online!`);
  // Pass the client to both the server and globals so it can use it for API operations
  setServerDiscordClient(client);
  setGlobalsDiscordClient(client);
  console.log("🚀 Express API server is ready to handle requests");
  // Start the background ban expiry checker
  startBanExpiryCheck();
});

// Start the bot
startBot();

// Handle interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Wrap reply/editReply/deferReply/followUp to convert deprecated { ephemeral: true } into flags
  const wrapReplyMethods = (intr) => {
    const wrap = (orig) => {
      return function (options) {
        try {
          if (options && typeof options === "object" && Object.prototype.hasOwnProperty.call(options, "ephemeral")) {
            const { ephemeral, ...rest } = options;
            if (ephemeral) rest.flags = 64; // EPHEMERAL flag
            return orig.call(this, rest);
          }
        } catch (e) {
          // fallback to original behavior
        }
        return orig.call(this, options);
      };
    };
    if (intr.reply) intr.reply = wrap(intr.reply.bind(intr));
    if (intr.editReply) intr.editReply = wrap(intr.editReply.bind(intr));
    if (intr.deferReply) intr.deferReply = wrap(intr.deferReply.bind(intr));
    if (intr.followUp) intr.followUp = wrap(intr.followUp.bind(intr));
  };
  try {
    wrapReplyMethods(interaction);
  } catch (e) {
    // ignore wrapper errors
  }
  try {
    // ...existing code...
      if (!interaction.guild || !interaction.member) {
        return interaction.reply({
          content: "This command can only be used in a server (guild).",
          ephemeral: true,
        });
      }

      // Allow only specific roles to use commands, or the bot owner (from env)
      const ALLOWED_ROLES = [
        "1156184281471787068", // Owner role
        "1158116870600261712", // Admin
        "1389665074444238960", // Head Moderator
        "1156205959128031333", // Moderator
      ];

      const BOT_OWNER_ID = process.env.OWNER_ID || null;

      // Safely read member roles (member.roles may be a Partial or missing cache)
      const member = interaction.member;
      const memberRoles = (member.roles && member.roles.cache)
        ? Array.from(member.roles.cache.keys())
        : [];

      const hasRolePermission = ALLOWED_ROLES.some((roleId) => memberRoles.includes(roleId));
      const isBotOwner = BOT_OWNER_ID && interaction.user && interaction.user.id === BOT_OWNER_ID;

      if (!hasRolePermission && !isBotOwner) {
        // Attempt to log unauthorized attempts to a channel named 'unauthorized-attempts'
        try {
          const logChannel = interaction.guild.channels.cache.find((ch) => ch.name === 'unauthorized-attempts');
          if (logChannel) {
            logChannel.send(`${interaction.user.tag} (${interaction.user.id}) attempted to use /${interaction.commandName} without permission.`);
          }
        } catch (err) {
          // ignore logging errors
        }

        return interaction.reply({
          content: "You don't have permission to use this command!",
          ephemeral: true,
        });
      }

      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      // Only try to reply if the interaction hasn't been replied to yet
      // Wrap in try-catch to prevent "already acknowledged" errors
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "There was an error executing this command!",
            ephemeral: true,
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: "There was an error executing this command!",
          });
        }
      } catch (replyError) {
        // If we fail to reply, just log it - the command may have already handled it
        console.error("Failed to send error reply:", replyError.message);
      }
    }
  });

// Handle process errors
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Catch uncaught exceptions to prevent node from exiting silently
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

// Log websocket errors from the Discord client
client.on('shardError', (error) => {
  console.error('A websocket connection encountered an error:', error);
});

// Also listen to the client's WebSocketManager for errors if available
try {
  if (client.ws && client.ws.on) {
    client.ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  }
} catch (e) {
  // ignore if ws not available
}

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
