# BeBe Backend

REST API for BeBe chat, built with **AdonisJS 7** and **PostgreSQL**.

## Setup

1. Install dependencies:

   ```bash
   cd backend
   pnpm install
   ```

2. Start the database in Docker (requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running):

   ```bash
   docker compose up -d
   ```

   This starts PostgreSQL 17 on **port 5433** with user, password and database all `bebe`, plus an empty `bebe_test` database for tests. Data survives restarts. `docker compose down` stops it; `docker compose down -v` also deletes all data.

3. Create `.env` from the example. Its defaults already match the Docker database:

   ```bash
   cp .env.example .env
   node ace generate:key   # fills APP_KEY
   ```

   | Variable      | Default     | Meaning         |
   | ------------- | ----------- | --------------- |
   | `DB_HOST`     | `127.0.0.1` | PostgreSQL host |
   | `DB_PORT`     | `5433`      | PostgreSQL port |
   | `DB_USER`     | `bebe`      | PostgreSQL user |
   | `DB_PASSWORD` | `bebe`      | Password        |
   | `DB_DATABASE` | `bebe`      | Database name   |

   Without Docker, point these at a locally installed PostgreSQL instead.

   If port 5433 is already taken (for example by a locally installed PostgreSQL, which then answers with "password authentication failed for user bebe"), set another `DB_PORT` in `.env`, such as `5434`, and run `docker compose up -d` again. Docker Compose reads `DB_PORT` from `.env`, so the container and the app use the same port.

4. Create the tables:

   ```bash
   node ace migration:run
   ```

   This also regenerates `database/schema.ts`, the column definitions the models build on. Never edit that file by hand.

## Run

```bash
pnpm run dev        # http://localhost:3333, restarts on change
```

All endpoints are under **`http://localhost:3333/api/v1`**. In development, CORS allows any origin, so the Quasar dev server can call the API directly.

## Useful commands

```bash
node ace migration:status     # which migrations ran
node ace migration:rollback   # undo the last batch
node ace migration:fresh      # drop all tables and migrate again (deletes data!)
pnpm run typecheck
pnpm run lint
```

## Database

| Table                | Purpose                                                                     | Use cases           |
| -------------------- | --------------------------------------------------------------------------- | ------------------- |
| `users`              | Account, unique nickname and email, presence status, mention-only setting   | UC1, UC8, UC9       |
| `auth_access_tokens` | Login tokens                                                                | UC1                 |
| `channels`           | Unique name, public/private, owner (admin), last activity for 30-day expiry | UC2, UC4            |
| `channel_users`      | User ↔ channel with state `invited` / `joined` / `banned`                   | UC2, UC4, UC5, UC10 |
| `kicks`              | One kick vote per member and target; 3 votes = permanent ban                | UC4                 |
| `messages`           | Channel messages, indexed for paged history                                 | UC3, UC7            |
| `mentions`           | Users addressed with `@nickname` in a message                               | UC6, UC8            |

Typing state and drafts (UC11) and notifications (UC8) are not stored. They are sent live and are only relevant while users are connected.
