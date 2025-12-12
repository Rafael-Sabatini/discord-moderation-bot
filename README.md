# Discord Moderation Bot

This project is a Discord bot designed to handle moderation features for the Rooftops and Alleys server. It includes functionalities such as user account age verification, email address verification to prevent alt account ban evasion, URL validation to identify fake links, and basic moderation commands like warn, mute, kick, and ban.

## Features

- **Account Age Verification**: Configurable command to set the required account age for users to access the server.
- **Email Verification**: Prevents users from using alt accounts by verifying email addresses.
- **URL Validation**: Checks URLs to ensure they are legitimate and not misleading.
- **Moderation Commands**: Includes commands for warning, muting, kicking, and banning users.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/rafael-sabatini/discord-moderation-bot.git
   ```

2. Navigate to the project directory:
   ```
   cd discord-moderation-bot
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add your Discord bot token and MongoDB connection string:
   ```
   TOKEN=your_discord_bot_token
   MONGODB_URI=your_uri
   ```

## Usage

To start the bot, run the following command:
```
node src/index.js
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.