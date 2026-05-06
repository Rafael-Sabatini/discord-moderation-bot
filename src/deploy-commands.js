const { REST, Routes } = require("discord.js");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Get environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [];

// Resolve correct path based on execution context
const commandsDir = path.join(__dirname, "commands");
if (!fs.existsSync(commandsDir)) {
  console.error(`❌ Commands directory not found at: ${commandsDir}`);
  process.exit(1);
}

const commandFolders = fs.readdirSync(commandsDir);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  
  const commandFiles = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    try {
      const filePath = path.join(folderPath, file);
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
      console.log(`❌ Error loading command ${file}:`, error.message);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(token);
const { Client, GatewayIntentBits } = require("discord.js");

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    
    // Log all command names being deployed
    console.log("Commands to deploy:");
    commands.forEach((cmd, index) => {
      console.log(`  ${index + 1}. ${cmd.name}`);
    });

    // Deploy commands to guild for instant testing, or globally if no guild specified
    if (guildId) {
      console.log(`Deploying commands to guild ${guildId} for instant availability...`);
      try {
        const result = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
        });
        console.log(`✅ Successfully deployed ${result.length} commands to guild!`);
        console.log("Deployed commands:");
        result.forEach((cmd, index) => {
          console.log(`  ${index + 1}. ${cmd.name}`);
        });
      } catch (deployError) {
        console.error("❌ Deployment error:", deployError.message);
        if (deployError.rawError?.errors) {
          console.error("Discord validation errors:", JSON.stringify(deployError.rawError.errors, null, 2));
        }
        throw deployError;
      }
    } else {
      // Deploy globally if no guild ID specified
      const result = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log(`✅ Successfully deployed ${result.length} global commands (may take up to 1 hour to sync).`);
    }

    // Setup guild-wide application command permissions to limit visibility to moderators
    if (guildId) {
      console.log(`Setting up command visibility for moderators only...`);
      try {
        const client = new Client({ intents: [GatewayIntentBits.Guilds] });
        await client.login(token);

        const guild = await client.guilds.fetch(guildId);
        if (guild) {
          // Define moderator role IDs
          const MODERATOR_ROLES = [
            "1156184281471787068", // Owner
            "1158116870600261712", // Admin
            "1389665074444238960", // Head Moderator
            "1156205959128031333", // Moderator
            "1437842615528722535", // Added user
          ];

          // Get all commands for this guild
          const guildCommands = await guild.commands.fetch();
          
          // Set permissions for each command to be visible only to moderators
          for (const command of guildCommands.values()) {
            try {
              // Create permissions: allow moderator roles, deny @everyone
              const permissions = [
                {
                  id: guild.roles.everyone.id,
                  type: "role",
                  permission: false, // Deny @everyone
                },
                ...MODERATOR_ROLES.map((roleId) => ({
                  id: roleId,
                  type: "role",
                  permission: true, // Allow moderators
                })),
              ];

              await command.permissions.set({ permissions });
              console.log(`✅ ${command.name} - visible to moderators only`);
            } catch (permError) {
              console.log(`⚠️  Could not set permissions for ${command.name}: ${permError.message}`);
            }
          }

          console.log(`✅ Command visibility configured.`);
        }

        await client.destroy();
      } catch (setupError) {
        console.warn(`⚠️  Could not setup command permissions: ${setupError.message}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
});
