# Discord Moderation Bot

A comprehensive Discord moderation bot with user verification, warning system, and role-based command access, backed by MongoDB Atlas.

## Features

- **User Verification**: Email and account age verification
- **Warning System**: Track user warnings with moderator information
- **Jailing System**: Temporarily restrict users
- **Moderation Commands**: Ban, kick, mute, purge, and more
- **REST API**: Full Express.js API for data management
- **MongoDB Integration**: Persistent data storage with MongoDB Atlas

## Project Structure

```
discord-moderation-bot/
├── src/
│   ├── server.js           # Express API server
│   ├── index.js            # Discord bot client
│   ├── config.js           # Configuration
│   ├── deploy-commands.js  # Command deployment script
│   ├── commands/           # Bot commands
│   ├── database/           # Database models
│   ├── events/             # Bot event handlers
│   └── utils/              # Utility functions
├── package.json
├── render.yaml             # Render deployment config
└── .env                    # Environment variables (local)
```

## Prerequisites

- Node.js 16+
- npm or yarn
- MongoDB Atlas account
- Discord Bot Token
- Render account (for deployment)

## Local Development

### 1. Clone and Install

```bash
git clone <repository-url>
cd discord-moderation-bot
npm install
```

### 2. Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your environment variables:

```env
TOKEN=your_discord_bot_token
OWNER_ID=your_discord_id
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
PORT=3000
NODE_ENV=development
```

### 3. MongoDB Atlas Setup

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP address (or use 0.0.0.0 for development)
4. Copy the connection string and update `MONGODB_URI` in `.env`

### 4. Run Locally

**Start the Express API server:**
```bash
npm start
```

**Start the Discord bot (separate terminal):**
```bash
npm run bot
```

**Development mode with auto-reload:**
```bash
npm run dev        # Runs server
npm run bot:dev    # Runs bot with nodemon
```

## API Endpoints

### Health Check
- `GET /health` - Server status

### Users
- `GET /api/users` - List all users
- `GET /api/users/:userId` - Get user by ID
- `POST /api/users` - Create new user
- `PATCH /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Delete user

### Warnings
- `GET /api/warnings` - List all warnings
- `GET /api/warnings/:userId` - Get warnings for user
- `POST /api/warnings` - Create warning
- `DELETE /api/warnings/:warningId` - Delete warning

### Jailed Users
- `GET /api/jailed-users` - List all jailed users
- `GET /api/jailed-users/:userId` - Check if user is jailed
- `POST /api/jailed-users` - Jail a user
- `DELETE /api/jailed-users/:userId` - Release user from jail

## Deployment on Render

### Step 1: Connect Repository

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository

### Step 2: Configure Service

The `render.yaml` file handles most configuration, but you can also configure manually:

- **Name**: `discord-moderation-bot-api`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Free or Paid (free tier available)

### Step 3: Add Environment Variables

In the Render dashboard, add environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/discord-bot?retryWrites=true&w=majority
TOKEN=your_discord_bot_token
OWNER_ID=your_owner_id
NODE_ENV=production
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically deploy when you push to your repository
3. Access your API at: `https://your-service-name.onrender.com`

### MongoDB Atlas Access from Render

1. In MongoDB Atlas, go to **Security > Network Access**
2. Add `0.0.0.0/0` to allow all IPs (or specific Render IP if available)
3. Ensure your database user has the correct permissions
4. Use the connection string in `MONGODB_URI`

## Running the Discord Bot on Render

To run the Discord bot continuously on Render:

1. Create a new **Background Worker** service instead of Web Service
2. Set **Start Command** to: `npm run bot`
3. This will keep your bot running 24/7

**Note**: Free tier services spin down after 15 minutes of inactivity. Use paid tier for production.

## Database Models

### User Schema
```javascript
{
  userId: String (unique),
  email: String (unique),
  accountAge: Date,
  isVerified: Boolean
}
```

### Warning Schema
```javascript
{
  userId: String,
  guildId: String,
  moderatorId: String,
  reason: String,
  timestamp: Date
}
```

### JailedUser Schema
```javascript
{
  userId: String (unique),
  guildId: String,
  jailedAt: Date
}
```

## Troubleshooting

### MongoDB Connection Issues

- **Error: `connect ECONNREFUSED`** - Check if MongoDB is running
- **Error: `authentication failed`** - Verify username/password in connection string
- **Error: `IP not whitelisted`** - Add your IP to MongoDB Atlas Network Access

### Render Deployment Issues

- **Service crashes on start** - Check build logs for errors
- **Cannot connect to MongoDB** - Ensure `MONGODB_URI` is set in environment variables
- **500 errors** - Check Render logs: Dashboard > Service > Logs

### Discord Bot Issues

- **Bot not responding** - Verify `TOKEN` is correct and bot has required intents
- **Missing permissions** - Ensure bot has necessary Discord permissions
- **Commands not working** - Run `npm run deploy-commands` to update slash commands

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TOKEN` | Yes | Discord bot token |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `OWNER_ID` | No | Discord ID of bot owner |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
