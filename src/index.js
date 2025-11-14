// ──────────────[ Discord.js Client & Intents ]──────────────
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  MessageFlags,
} = require("discord.js");

// ✅ Create a new Discord client with clear, explicit intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // ✅ Required: Basic guild/server info
    GatewayIntentBits.GuildMembers, // ✅ Required: Guild member info
    GatewayIntentBits.GuildMessages, // ✅ To read messages in guild channels
    GatewayIntentBits.MessageContent, // ✅ To access the content of messages
    GatewayIntentBits.DirectMessages, // ✅ To handle direct messages (DMs)
    // GatewayIntentBits.GuildExpressions, // Required for emojis
    // GatewayIntentBits.GuildEmojisAndStickers,
  ],
  partials: [Partials.Channel], // ✅ Needed for partial DM channels
});

// ✅ Initialize collections BEFORE any handlers
client.commands = new Collection();
client.prefix = new Collection();

// ──────────────[ Core Modules & Config ]──────────────
const chalk = require("chalk");
const figlet = require("figlet");
const fs = require("fs");
const path = require("path");
// Added by Luxe
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// ──────────────[ Function Handlers ]──────────────
const { eventsHandler } = require("./functions/handlers/handelEvents");
const { handleCommands } = require("./functions/handlers/handleCommands");
const { prefixHandler } = require("./functions/handlers/prefixHandler");
const { checkMissingIntents } = require("./functions/handlers/requiredIntents");
const { antiCrash } = require("./functions/handlers/antiCrash");
const { initActivityTracker } = require("./functions/handlers/activityTracker");
const { buildUpdateMessage } = require("./functions/handlers/updateBuilder.ts");
require("./functions/handlers/watchFolders");

// ──────────────[ Setup Paths ]──────────────
const adminFolderPath = path.join(__dirname, "../admin");
const dashboardFilePath = path.join(adminFolderPath, "dashboard.js");

const eventsPath = "./events";

// ──────────────[ Safety Nets ]──────────────
antiCrash();

// ──────────────[ Error Handling ]──────────────
const errorsDir = path.join(__dirname, "../../../errors");

function ensureErrorDirectoryExists() {
  if (!fs.existsSync(errorsDir)) {
    fs.mkdirSync(errorsDir);
  }
}

async function loadGradient() {
  const mod = await import("gradient-string");
  return mod.default;
}

function logErrorToFile(error) {
  try {
    // Check if error logging is enabled in discobase.json
    const discobasePath = path.join(__dirname, "../discobase.json");
    if (fs.existsSync(discobasePath)) {
      const discobaseConfig = JSON.parse(
        fs.readFileSync(discobasePath, "utf8")
      );
      if (
        discobaseConfig.errorLogging &&
        discobaseConfig.errorLogging.enabled === false
      ) {
        // Error logging is disabled, do nothing
        return;
      }
    }

    ensureErrorDirectoryExists();

    // Convert the error object into a string, including the stack trace
    const errorMessage = `${error.name}: ${error.message}\n${error.stack}`;

    const fileName = `${new Date().toISOString().replace(/:/g, "-")}.txt`;
    const filePath = path.join(errorsDir, fileName);

    fs.writeFileSync(filePath, errorMessage, "utf8");
  } catch (err) {
    // If there's an error while logging the error, just silently fail
    // We don't want errors in error logging to cause more issues
  }
}

// ──────────────[ ASCII Art & Header ]──────────────
function printAsciiArt() {
  return new Promise((resolve, reject) => {
    figlet(
      "Discobase",
      {
        font: "ANSI Shadow",
        horizontalLayout: "default",
        verticalLayout: "default",
        width: 100,
        whitespaceBreak: true,
      },
      function (err, data) {
        if (err) {
          console.log("Something went wrong with ASCII art...");
          console.dir(err);
          reject(err);
        } else {
          // Create a premium border around the ASCII art
          const lines = data.split("\n");
          const width = Math.max(...lines.map((line) => line.length));
          const horizontalBorder = "\u2550".repeat(width + 4);
          const topBorder = "\u2554" + horizontalBorder + "\u2557";
          const bottomBorder = "\u255A" + horizontalBorder + "\u255D";

          console.log();
          console.log(chalk.cyan(topBorder));
          lines.forEach((line) => {
            // Add padding to make all lines the same width
            const padding = " ".repeat(width - line.length);
            // ✅ Apply gradient to each line!
            const gradientLine = gradient(["cyan", "magenta"])(line);
            console.log(
              chalk.cyan("\u2551 ") +
                gradientLine +
                padding +
                chalk.cyan(" \u2551")
            );
          });
          console.log(chalk.cyan(bottomBorder));

          // Add version and author info in a stylish box
          const version = require("../package.json").version;
          const infoLine = `DiscoBase v${version} | The Ultimate Discord Bot toolkit!`;
          const infoWidth = infoLine.length + 4;
          const infoBoxTop = "\u250C" + "\u2500".repeat(infoWidth) + "\u2510";
          const infoBoxBottom =
            "\u2514" + "\u2500".repeat(infoWidth) + "\u2518";

          console.log();
          console.log(chalk.gray(infoBoxTop));
          console.log(
            chalk.gray("\u2502 ") +
              chalk.white.bold(infoLine) +
              chalk.gray(" \u2502")
          );
          console.log(chalk.gray(infoBoxBottom));
          console.log();

          resolve();
        }
      }
    );
  });
}

// ──────────────[ Logger Function ]──────────────
// Custom logger function for consistent formatting
function logger(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  let prefix, icon, color;

  switch (type.toUpperCase()) {
    case "SUCCESS":
      icon = "✓";
      prefix = "SUCCESS";
      color = chalk.green;
      break;
    case "INFO":
      icon = "ℹ";
      prefix = "INFO";
      color = chalk.blue;
      break;
    case "WARNING":
      icon = "⚠";
      prefix = "WARNING";
      color = chalk.yellow;
      break;
    case "ERROR":
      icon = "✖";
      prefix = "ERROR";
      color = chalk.red;
      break;
    case "SYSTEM":
      icon = "⚙";
      prefix = "SYSTEM";
      color = chalk.cyan;
      break;
    default:
      icon = "•";
      prefix = type;
      color = chalk.white;
  }

  // Create a box-like format for the log message
  const timeBox = chalk.gray(`[${timestamp}]`);
  const typeBox = color.bold(` ${icon} ${prefix} `);
  const messageText = color(`${message}`);

  console.log(`${timeBox}${typeBox}${chalk.white(" │ ")}${messageText}`);
}

// ──────────────[ Main Bot Code ]──────────────
(async () => {
  gradient = await loadGradient();
  await printAsciiArt();

  try {
    // Create fancy section headers
    function createHeader(title, icon, color) {
      const width = 80;
      const titleText = ` ${icon}  ${title} `;
      const padding = width - titleText.length;
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;

      console.log();
      console.log(chalk.gray("┌" + "─".repeat(width - 2) + "┐"));
      console.log(
        chalk.gray("│") +
          chalk.gray("─".repeat(leftPad)) +
          color.bold(titleText) +
          chalk.gray("─".repeat(rightPad)) +
          chalk.gray("│")
      );
      console.log(chalk.gray("└" + "─".repeat(width - 2) + "┘"));
    }

    createHeader("LOADING COMPONENTS", "⚙️", chalk.magenta);

    // ✅ CRITICAL: Load prefix commands BEFORE events and login
    logger("INFO", "Loading prefix commands...");
    prefixHandler(client, path.join(process.cwd(), "src/messages"));
    logger(
      "SUCCESS",
      `Prefix commands loaded successfully! (${client.prefix.size} commands)`
    );

    // ✅ Debug: List loaded prefix commands
    if (client.prefix.size > 0) {
      const commandNames = Array.from(client.prefix.keys()).join(", ");
      logger("INFO", `Available prefix commands: ${commandNames}`);
    }

    // Load function handlers
    require("./functions/handlers/functionHandler");

    // Load event handlers (this includes messageCreate for prefix commands)
    logger("INFO", "Loading event handlers...");
    await eventsHandler(client, path.join(__dirname, eventsPath));
    logger("SUCCESS", "Event handlers loaded successfully!");

    // Check for missing intents
    checkMissingIntents(client);

    // ✅ NOW login to Discord
    logger("INFO", "Connecting to Discord...");

    await client.login(process.env.BOT_TOKEN);
    logger("SUCCESS", `Bot "${client.user.username}" logged in successfully!`);

    // Load slash commands AFTER login
    logger("INFO", "Loading slash commands...");
    await handleCommands(client, path.join(process.cwd(), "src/commands"));
    logger(
      "SUCCESS",
      `Slash commands loaded successfully! (${client.commands.size} commands)`
    );

    if (fs.existsSync(adminFolderPath) && fs.existsSync(dashboardFilePath)) {
      require(dashboardFilePath);
      logger("SUCCESS", "Admin dashboard loaded successfully!");
    }

    // Initialize activity tracker to watch the entire project
    initActivityTracker(path.join(__dirname, ".."));
    logger("SUCCESS", "Activity tracker initialized for all project folders");

    createHeader("BOT READY", "🚀", chalk.green);
    // Bot is ready so define server endpoints here

    const app = express();
    app.use(bodyParser.json());
    app.use(cors()); // Allow frontend requests

    // HTTP endpoint for frontend to trigger Discord message
    app.post("/send-message", async (req, res) => {
      try {
        const { data, channelId } = req.body; // Frontend sends content and optional channel ID
        console.log("body", req.body);
        if (!data) {
          return res.status(400).json({ error: "Content is required" });
        }

        const targetChannelId =
          channelId || process.env.BOT_DEFAULT_CHANNEL_ID || "YOUR_CHANNEL_ID";
        const channel = client.channels.cache.get(targetChannelId);

        if (!channel || !channel.isTextBased()) {
          logger("ERROR", `Invalid or non-text channel: ${targetChannelId}`);
          return res.status(400).json({ error: "Invalid channel" });
        }

        const container = buildUpdateMessage(data, client);

        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });

        logger("SUCCESS", `Message sent to channel ${targetChannelId}!`);
        res.json({ success: true, message: "Sent to Discord!" });
      } catch (error) {
        logger("ERROR", `Failed to send message: ${error.message}`);
        logErrorToFile(error);
        res.status(500).json({ error: "Failed to send message" });
      }
    });

    app.get("/emojis", async (req, res) => {
      try {
        if (!client.isReady()) {
          return res
            .status(503)
            .json({ error: "Discord client is not ready yet" });
        }

        const guildId = process.env.GUILD_ID;
        if (!guildId) {
          return res.status(400).json({ error: "GUILD_ID not set in .env" });
        }

        // Fetch guild to ensure emojis are loaded
        let guild = client.guilds.cache.get(guildId);
        if (!guild || guild.partial) {
          guild = await client.guilds.fetch(guildId);
        }

        // Map guild.emojis.cache to frontend-friendly format
        const emojis = Array.from(guild.emojis.cache).map(([id, emoji]) => ({
          name: emoji.name, // e.g., 'luxeprWahoo'
          id: emoji.id,
          identifier: emoji.animated
            ? `<a:${emoji.name}:${emoji.id}>`
            : `<:${emoji.name}:${emoji.id}>`, // Handles animated emojis
        }));

        console.log("Fetched emojis:", emojis);

        if (emojis.length === 0) {
          logger(
            "WARN",
            `No emojis found in guild ${guildId}. Check bot permissions.`
          );
        }

        res.json(emojis); // Sends [{ name: 'luxeprWahoo', id: '123', identifier: '<:luxeprWahoo:123>' }, ...]
      } catch (error) {
        logger("ERROR", `Failed to fetch emojis: ${error.message}`);
        res.status(500).json({ error: "Failed to fetch emojis" });
      }
    });

    app.get("/roles", async (req, res) => {
      try {
        if (!client.isReady()) {
          return res
            .status(503)
            .json({ error: "Discord client is not ready yet" });
        }

        const guildId = process.env.GUILD_ID;
        if (!guildId) {
          return res.status(400).json({ error: "GUILD_ID not set in .env" });
        }

        let guild = client.guilds.cache.get(guildId);
        if (!guild || guild.partial) {
          guild = await client.guilds.fetch(guildId);
        }

        // Map roles to frontend-friendly format
        const roles = Array.from(guild.roles.cache)
          .filter(([id, role]) => role.name !== "@everyone" && !role.managed) // Exclude @everyone and managed roles
          .map(([id, role]) => ({
            name: role.name, // e.g., 'Admin'
            id: role.id, // e.g., '987654321098765432'
            mention: `<@&${role.id}>`, // e.g., '<@&987654321098765432>'
          }));

        if (roles.length === 0) {
          logger(
            "WARN",
            `No eligible roles found in guild ${guildId}. Check bot permissions.`
          );
        }

        res.json(roles); // Sends [{ name: 'Admin', id: '987654321098765432', mention: '<@&987654321098765432>' }, ...]
      } catch (error) {
        logger("ERROR", `Failed to fetch roles: ${error.message}`);
        res.status(500).json({ error: "Failed to fetch roles" });
      }
    });

    // Start HTTP server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      createHeader(`SERVER RUNNING ON PORT ${port}`, "❤️", chalk.greenBright);
    });
  } catch (error) {
    if (error.message === "An invalid token was provided.") {
      logger(
        "ERROR",
        "The token provided for the Discord bot is invalid. Please check your configuration."
      );
      logErrorToFile(error);
    } else {
      logger("ERROR", `Failed to start bot: ${error.message}`);
      console.error(error);
      logErrorToFile(error);
    }
  }
})();

module.exports = client;

// ──────────────[ Bot Logic ]──────────────
//* You can start writing your custom bot logic from here!

// ──────────────[ Express Server Setup ]──────────────
// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
