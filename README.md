# Chat App

A Discord-like web application for text communication. Users can create and join public or private channels, send messages, mention other users, view message history and receive notifications.

The app also supports user statuses, channel management and real-time typing indicators.

Built as a PWA using Quasar/Vue, AdonisJS and PostgreSQL.

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