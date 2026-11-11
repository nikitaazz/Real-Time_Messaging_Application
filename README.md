<div align="center">

# 💬 BeBe Chat

**A Discord-like chat web app with public and private channels, slash commands, mentions and notifications.**

![Vue](https://img.shields.io/badge/Vue_3-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Quasar](https://img.shields.io/badge/Quasar-1976D2?style=for-the-badge&logo=quasar&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-FFD859?style=for-the-badge&logo=pinia&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![AdonisJS](https://img.shields.io/badge/AdonisJS-5A45FF?style=for-the-badge&logo=adonisjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

<img src="quasar-project/screenshots/main_screen.png" alt="Main screen" width="85%">

</div>

---

## ✨ Features

- 📢 **Channels.** Create, join and leave public or private channels; accept or reject invitations
- ⌨️ **Slash commands.** `/join`, `/invite`, `/revoke`, `/kick`, `/cancel`, `/quit`, `/list`, `/help`
- 🏷️ **Mentions** with `@nickname`, and the full chat history with infinite scrolling
- ⚡ **Real time.** New messages, invitations and status changes arrive instantly
- ✍️ **Typing indicators**, with a live preview of what someone is writing
- 🟢 **User statuses.** Online, Do Not Disturb, Offline
- 🔔 **Notifications** while the app is in the background, optionally only for mentions
- ⏳ **Channel expiry.** A channel without a message for 30 days is removed
- 🎨 **Themes.** Several color themes
- 📱 **Installable PWA** with a service worker

## 🛠 Tech stack

| | |
|---|---|
| Frontend | Vue 3 + Quasar 2 (Vite), PWA |
| Backend | AdonisJS 7 (REST API) |
| Database | PostgreSQL 17, created by migrations |
| Real time | Socket.IO |
| Language | TypeScript |
| State | Pinia |
| Routing | Vue Router (file-based routes) |
| Quality | oxlint + oxfmt and `node:test` (frontend), ESLint + Prettier and Japa tests (backend) |

> Built as a project for the VPWA (Progressive Web Applications) course.

## 🚀 How to Run

### Run the full project with Docker

From the repository root, run:

```bash
docker compose up --build
```

Open **http://localhost:9000**. Docker Compose starts the Quasar frontend,
AdonisJS API, and PostgreSQL database; the API applies database migrations
when it starts. Stop the services with `docker compose down`. Database data
is kept in a Docker volume; `docker compose down -v` deletes it.

The API is available at **http://localhost:3333** and PostgreSQL at
**localhost:5433**.

To start the services in the background, add `-d` to the `up` command.
Use `docker compose logs -f` to follow logs.

The database is the same one that `backend/docker-compose.yml` starts for local
development, so both setups share their data and can't run twice at once.

No `APP_KEY` is stored in the repository: without one, the API container
creates a random key each time it starts. To keep a fixed key, put
`APP_KEY=...` in a `.env` file next to `docker-compose.yml` (it is ignored by
git); `node ace generate:key --show` in `backend/` prints a new one.

If Docker reports that the container name `bebe-db` is already in use, it was
created by an older version of this setup. Remove it once with
`docker rm -f bebe-db`; the data in its volume is not deleted.

### Run for development (without Docker for the app)

Start the database and the API first. The steps are in
[backend/README.md](backend/README.md); in short, from the `backend` directory:

```bash
pnpm install
docker compose up -d       # PostgreSQL only
cp .env.example .env       # first time only
node ace generate:key      # first time only
node ace migration:run
pnpm run dev               # API on http://localhost:3333
```

Then start the frontend as described below.

### 1. Install Dependencies

Navigate to the `quasar-project` directory:

```bash
cd quasar-project
pnpm install
```

Alternatively, you can use `npm`, `yarn` or `bun`.

### 2. Start the App in Development Mode

From the `quasar-project` directory, run:

```bash
pnpm exec quasar dev
```

Alternatively, if Quasar CLI is available globally:

```bash
quasar dev
```

The application will start in development mode with hot module replacement (HMR).

### 3. Format and Lint

To format and lint the files, run:

```bash
pnpm run lint
```

To check formatting and linting without making changes, run:

```bash
pnpm run lint:check
```

### 4. Build for Production

To build the application for production, run:

```bash
pnpm exec quasar build -m pwa
```

Without `-m pwa`, Quasar builds a plain single-page app without the service worker.

## 📖 How to Use

![Authentication interface](quasar-project/screenshots/login_screen.png)

🔴 Theme switcher — the application supports multiple themes.

🟡 No account? Register by clicking the link.

🟢 Fill in the form to log in to your account.

![Main interface](quasar-project/screenshots/main_screen.png)

🔴 Control Panel
Manage your channels in one place. Click the **+** button to create public or private channels. Join or leave channels and accept or reject invitations.

🔵 Chat Window
View your message history and communicate with other channel members.

🟡 Command Line
Use commands to manage channels and members, or type a message to send it directly to the chat.

**Available commands:**
- `/join channelName [private]` — join a public channel, or create a channel if the name is free (you become its admin).
- `/invite nickName` — invite a user. In a private channel only the admin can invite; the admin's invitation also lifts a ban.
- `/revoke nickName` — the admin removes a user from a private channel or takes back an invitation.
- `/kick nickName` — vote to kick a member of a public channel. After 3 different members' votes the user is banned; the admin's kick bans at once.
- `/cancel` — leave the channel. If the admin leaves, the channel is deleted.
- `/quit` — the admin closes the channel for everyone.
- `/list` — show the members of the channel and their status.
- `/help` — show all commands.

🟢 Channel Members
View all members of the current channel and check their online status. Easily see who is available to participate in the conversation.

![Settings interface](quasar-project/screenshots/settings_screen.png)

🔵 Set Your Status
Choose your current status to let other users know your availability:
- **Online** — you are available and get notifications.
- **Do Not Disturb** — you still get messages, but no notifications.
- **Offline** — you get no messages; when you go back online, your channels catch up automatically.

🟡 Enable Notifications
Enable notifications to be told about new messages while BeBe is in the background. You can limit them to messages that mention you.

🔴 Test Notification
Send a test notification to check whether notifications are working correctly.
