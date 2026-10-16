# Chat App

A Discord-like web application for text communication where users can create and join public or private channels, exchange messages, mention other users, and view chat history. The app supports user statuses, channel management, real-time typing indicators, and notifications, making it easy to communicate, collaborate, and stay connected with others.

## How to Run

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
pnpm exec quasar build
```

## How to Use

![Authentication interface](screenshots/login_screen.png)

### 🔴 Theme switcher — the application supports multiple themes.

### 🟡 No account? Register by clicking the link.

### 🟢 Fill in the form to log in to your account.

![Main interface](screenshots/main_screen.png)

### 🔴 Control Panel
Manage your channels in one place. Click the **+** button to create public or private channels. Join or leave channels and accept or reject invitations.

### 🔵 Chat Window
View your message history and communicate with other channel members.

### 🟡 Command Line
Use commands to manage channels and members, or type a message to send it directly to the chat.

**Available commands:**
- `/join` — join a channel.
- `/invite` — invite a user to a channel.
- `/revoke` — revoke a user's invitation.
- `/kick` — remove a user from a channel.

### 🟢 Channel Members
View all members of the current channel and check their online status. Easily see who is available to participate in the conversation.

![Settings interface](screenshots/settings_screen.png)

### 🔵 Set Your Status
Choose your current status to let other users know your availability:
- **Online** — you are available.
- **Away** — you are temporarily inactive.
- **Do Not Disturb** — you prefer not to be disturbed.

### 🟡 Enable Notifications
Enable notifications to stay informed about new messages and other chat activity.

### 🔴 Test Notification
Send a test notification to check whether notifications are working correctly.