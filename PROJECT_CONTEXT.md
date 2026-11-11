# BeBe Chat — Project Context

> Handoff document for the VPWA semester project.
> Part 1 is the lecturer's assignment ([kurice/vpwa27 › semestralny-projekt](https://github.com/kurice/vpwa27/tree/main/semestralny-projekt)), translated from Slovak and paraphrased.
> Part 2 is what our team has built so far, and what is left.
> Last updated: 2026-11-11.

---

## Part 1 — Assignment (from the lecturer's GitHub)

### 1.1 Goal

Build a **Progressive Web App for IRC/Slack-style text chat**.

**Required technologies (no other core technologies allowed):**

| Layer | Technology |
|---|---|
| Frontend | **Quasar** (SPA → PWA) |
| Backend | **AdonisJS** |
| Database | Relational: **PostgreSQL** or **MySQL** |

Teams of **two**. Both members must contribute a significant, roughly equal share, and both must understand the whole project. Both get the same grade.

### 1.2 Use cases (11)

**UC1: Accounts.** Register, log in, log out. A user has a **first name, last name, nickname and email**.

**UC2: Channel list.**
- Shows only channels the user is a member of.
- A channel disappears from the list when the user leaves it or is permanently banned from it.
- Channels the user is **invited to are highlighted and shown at the top**.
- From the list, a user can create or leave a channel. The **admin** can also cancel (delete) it.
- Two types: **public** and **private**.
- The channel creator is its admin.
- A channel with **no new message for more than 30 days stops existing**, and its name becomes free again.

**UC3: Command line.** A fixed input bar for messages and commands. Messages can be sent only to channels the user belongs to.

**UC4: Creating channels and managing members.**
- `/join channelName [private]`: any user can create a channel this way.
- **Private channel:** only the admin can add or remove members, with `/invite nickName` and `/revoke nickName`.
- **Public channel:** anyone can join with `/join channelName`. If the channel doesn't exist yet, it is created.
- `/invite` in a public channel: any member can invite.
- `/kick nickName` in a public channel: any member can kick. When **3 different members** kick the same user, that user is **permanently banned** from the channel.
- The **admin** can permanently ban at any time with `/kick`, and can lift a ban with `/invite`.
- **Nicknames and channel names are unique.**
- `/quit`: the admin closes (deletes) the channel.

**UC5: /cancel.** A member leaves the channel. If the admin uses `/cancel`, the channel is deleted.

**UC6: Mentions.** Writing `@nickname` addresses the message to that user, and it is **highlighted** in that user's message list.

**UC7: History.** The full message history is viewable, with **efficient infinite scroll**.

**UC8: Notifications.**
- Shown **only when the app is not visible** (Quasar App Visibility plugin).
- Show the **sender and part of the message**.
- The user can choose to be notified **only for messages addressed to them**.

**UC9: Status.**
- Online, DND (do not disturb), Offline. **Status is visible to other users.**
- DND: no notifications.
- Offline: the user receives no messages. When they switch back to Online, their channels update automatically.

**UC10: /list.** Shows a channel's members, only if the user is a member of that channel.

**UC11: Typing indicator and draft preview.**
- The active channel's status bar shows who is typing (for example "Ed is typing").
- Clicking that nickname shows their **unsent draft live**, updated on every keystroke.

**Unclear points in the spec** (decide and document your interpretation):
- Does the admin's `/kick` count toward the 3-kick ban threshold?
- Does `/kick` apply in private channels? The spec only mentions public channels.
- How are channels other than invitations ordered?

### 1.3 Phases, deadlines and points

| Phase | Deadline | Points | Deliverables |
|---|---|---|---|
| **Phase 1** | End of week 5: **18 Oct, 23:59** in AIS | 12 | Responsive, clickable Quasar SPA prototype covering all use cases, plus a **UML class diagram** of the logical data model as **JPEG** |
| **Control phase** | Week 9, in lab | 5 (pass/fail) | Demo to the instructor. Pass if **at least 6 of 11 use cases** work. Code quality is not assessed. |
| **Phase 2** | End of week 12: **6 Dec, 23:59** in AIS | 30 | Full **PWA** meeting all requirements, data model created through **migrations**, plus documentation |

- **Consultations:** Phase 1 in weeks 2–5, Phase 2 in weeks 7–12, during labs.
- **Presentations:** Phase 1 in week 6 (on your own laptop). Final project in week 13 (date can be agreed individually).

### 1.4 Phase 2 documentation must contain

1. The assignment.
2. A **physical data model** diagram, with justification for any changes since Phase 1.
3. One or more **architecture diagrams**.
4. **Design decisions**, including a justification for every external library used.
5. At least **5 key screenshots** (app-store style).

### 1.5 Submission rules

- A **public GitHub repository** must exist throughout the semester. Commit continuously, and review each other's code. Activity must be reasonably balanced between both members; the commit history is used as grading evidence.
- **Only one member submits to AIS.** Agree in advance who.
- Submit one **ZIP or RAR** with all source code, **without frameworks or npm packages** (no `node_modules`, no `dist`).
- If you modified a library, include the modified version and document what changed and why.
- Include **`repo.txt`** containing the repository link. The repo may be made private after the course ends.

**Late submission:** up to 3 days. Each day costs 25% of the maximum points. After 3 days, nothing is accepted. A missing part means failing the course requirements.

### 1.6 Authorship rules

- Reusing code from past students means an **automatic F**.
- Cite all external sources (books, internet) **in code comments, with a link**. Uncited material may be treated as plagiarism.
- LLM-generated code is allowed **only if you can explain every part of it**. Code you can't explain means the project is not accepted.
- Each student must be able to explain any part of the team's solution, including parts they didn't write.

---



## Part 2 — Our project

### 2.1 Basics

| | |
|---|---|
| App name | **BeBe** |
| Repository | [nikitaazz/Real-Time_Messaging_Application](https://github.com/nikitaazz/Real-Time_Messaging_Application) |
| Team | Zakharii Okseniuk, Mykyta Nosenko |
| Local path | `D:\VPWA` (frontend in `quasar-project/`, backend in `backend/`) |
| Frontend | Vue 3, Quasar 2 (Vite), TypeScript, Pinia, file-based Vue Router, PWA service worker, oxlint/oxfmt, `node:test` |
| Backend | AdonisJS 7, Lucid ORM, VineJS validation, access-token auth, Japa tests, ESLint/Prettier |
| Database | PostgreSQL 17 in Docker (port 5433) |
| Real time | Socket.IO (`socket.io` on the backend, `socket.io-client` on the frontend) |

**Whole app in Docker (from the repository root):**

```bash
docker compose up --build     # frontend :9000, API :3333, database :5433
docker compose down
```

The API runs the migrations when it starts. No `APP_KEY` is stored in the repo: the API container creates a random one at start, or uses `APP_KEY` from a root `.env` (ignored by git).

**Development (backend from `backend/`, frontend from `quasar-project/`):**

```bash
# backend
pnpm install
docker compose up -d          # only the database (the same one the root setup uses)
cp .env.example .env          # first time only
node ace generate:key         # first time only
node ace migration:run
pnpm run dev                  # http://localhost:3333, API under /api/v1
node ace test                 # uses the separate bebe_test database, port 3334
pnpm run typecheck && pnpm run lint

# frontend
pnpm install
pnpm exec quasar dev             # http://localhost:9000
pnpm run typecheck
pnpm run lint                    # format + lint (fix)
node --test tests/*.test.mjs     # commands, mentions, notifications
pnpm exec quasar build -m pwa    # PWA build (without -m pwa: plain SPA)
```

The frontend reads the API address from `QCLI_API_URL` (see `quasar-project/.env.example`). The default is `http://localhost:3333/api/v1`; the WebSocket uses the same host and port.

**Docker notes:**

- Both `docker-compose.yml` files use the project name `bebe`, the container `bebe-db` and the volume `bebe-pgdata`. The root file includes `backend/docker-compose.yml`, so there is only one database.
- "Container name `bebe-db` is already in use" means a container from an older setup exists: `docker rm -f bebe-db` once (the data volume is kept).
- Docker Compose reads `DB_PORT` from `backend/.env`; change it there if port 5433 is taken.

### 2.2 History of `main`

`main` contains everything. Start new work from `main`.

| Date | Commit | What reached `main` | Who | How |
|---|---|---|---|---|
| 9 Nov | `a82b370` | Backend setup, Docker database, migrations | Zakharii | Pull request #1, merged by its author |
| 10 Nov | `a203171` | UC1 accounts; messages, history, mentions, /list, live messages | Zakharii; Mykyta | Mykyta's pull request #2 went into `feat/auth` by mistake; `feat/auth` was then pushed to `main` |
| 10 Nov | `4b9cabc` | UC2 channel list, UC5, `/join`, `/quit`, 30-day expiry | Zakharii | Pushed to `main` directly |
| 11 Nov | `5147901` | UC4 `/invite` `/revoke` `/kick`, UC8, UC9, UC11, mock store removed, Docker for the whole app | Mykyta | Pushed to `main` directly, one commit named "updt" |
| 11 Nov | `7fcb0b0` | Fix for simultaneous kick votes; one shared Docker database; no `APP_KEY` in the repo | Zakharii | Pushed to `main` directly |

The old branches `feat/backend-setup`, `feat/auth`, `feat/messages` and `feat/channels` are fully contained in `main`.

### 2.3 Code layout

**Backend (`backend/`)**

| Path | Contents |
|---|---|
| `start/routes.ts` | All HTTP routes, under `/api/v1` |
| `start/ws.ts`, `app/services/ws.ts` | Socket.IO server on the same port as HTTP; rooms per channel and per user; offline users are kept out of channel rooms (UC9); passes typing events on (UC11) |
| `app/controllers/new_account_controller.ts`, `access_tokens_controller.ts`, `profile_controller.ts` | UC1 register, login, logout, me; `PATCH /auth/me` for status and mention-only (UC8, UC9) |
| `app/controllers/channels_controller.ts` | UC2 list, UC4 `/join` and `/quit`, UC5 `/cancel` |
| `app/controllers/channel_members_controller.ts` | UC10 `/list`; UC4 `/invite`, `/revoke`, `/kick` |
| `app/controllers/channel_messages_controller.ts` | UC3 sending, UC6 mentions, UC7 history |
| `app/models/` | `User`, `Channel`, `ChannelUser`, `Kick`, `Message` with relationships |
| `app/services/channel_access.ts` | `isMember()`, `findJoinedChannel()`: the members-only check used by every channel endpoint |
| `app/services/channel_expiry.ts` | `isExpired()`, `removeExpiredChannels()`: the 30-day rule (UC2) |
| `app/services/mentions.ts` | Parses `@nickname` and finds the mentioned channel members |
| `app/validators/` | `user` (signup, login, profile update), `channel` (channel name, member command), `message` (body, history query), `id` |
| `app/transformers/` | What the API returns for a user, a channel, a member and a message |
| `app/exceptions/channel_access_exception.ts` | All 403/404/409 errors of the channel endpoints, with an error `code` |
| `database/migrations/` | 7 migrations (see 2.4) |
| `database/schema.ts` | **Generated** by `node ace migration:run`. Never edit by hand. |
| `tests/functional/`, `tests/unit/` | 69 Japa tests (see 2.7) |
| `docker-compose.yml`, `docker/init.sql` | The database, plus the `bebe_test` database |
| `Dockerfile` | API image for the full Docker setup |

**Frontend (`quasar-project/`)**

| Path | Contents |
|---|---|
| `src/services/api.ts` | `api()` helper on top of `fetch`; keeps the login token; `ApiError` with per-field errors |
| `src/services/socket.ts` | Socket.IO client and the list of events (see 2.5) |
| `src/services/notifications.ts` | Shows browser notifications; uses Quasar `AppVisibility` (UC8) |
| `src/boot/realtime.ts` | Connects the socket on login, hands every event to its store, opens the channel when a notification is clicked |
| `src/stores/auth.ts` | Register, login, logout, session restore, status and mention-only settings |
| `src/stores/channels.ts` | Channel list, selection, unread counters, join/leave/close, invite/revoke/kick, live channel events |
| `src/stores/messages.ts` | Sending, paged history, members and their status, live messages, catch-up after reconnect |
| `src/stores/typing.ts` | Who is typing and their live draft (UC11) |
| `src/utils/commands.ts` | Parses the command line (`/join`, `/invite`, ...) and the `/help` text |
| `src/utils/mentions.ts` | Splits a message into text and highlighted `@nickname` parts |
| `src/utils/notifications.ts` | The notification rules (visible, DND, offline, mention-only), kept testable |
| `src/pages/index/login.vue`, `registration.vue` | Auth pages |
| `src/pages/index/main.vue` | Chat: channel list, messages, command line, typing bar, member panel, status menu |
| `src/pages/index/settings.vue` | Status, mention-only, notification permission and a test notification, logout |
| `src/router/index.ts` | Route guard based on the auth store |
| `src-pwa/` | PWA manifest and service worker |
| `tests/` | 21 `node:test` tests: commands, mentions, notifications |
| `Dockerfile` | Frontend image for the full Docker setup |
| `docs/data-model.puml`, `DB.pdf` | Phase 1 logical data model |

The fake `example-store.ts` from Phase 1 has been removed; all data comes from the backend.

Leftovers from the Quasar starter template that nothing uses: `src/components/EssentialLink.vue`, `src/pages/index/second.vue`. They can be deleted.

### 2.4 Data model (physical, created by migrations)

| Table | Columns | Use cases |
|---|---|---|
| `users` | first_name, last_name, nick_name (unique), email (unique), password, status (`online`/`dnd`/`offline`), mention_only | UC1, UC8, UC9 |
| `auth_access_tokens` | Login tokens (AdonisJS auth) | UC1 |
| `channels` | name (unique), is_private, owner_id, last_activity_at | UC2, UC4 |
| `channel_users` | channel_id, user_id, state (`invited`/`joined`/`banned`), invited_by, joined_at | UC2, UC4, UC5, UC10 |
| `kicks` | channel_id, target_id, kicked_by (unique together): one kick vote per member and target | UC4 |
| `messages` | channel_id, author_id, body; index on (channel_id, id) for paged history | UC3, UC7 |
| `mentions` | message_id, user_id | UC6, UC8 |

Nicknames and emails are unique regardless of letter case (checked at signup).

**Changes since the Phase 1 model** (the Phase 2 documentation must justify these):

- Integer auto-increment ids instead of UUIDs: simpler, and message ids double as the history cursor.
- `Membership.role` dropped: the admin is `channels.owner_id`.
- `Invitation` merged into `channel_users.state = 'invited'`.
- `KickRecord` split into `kicks` (the votes) and `channel_users.state = 'banned'` (the result).
- `Notification` and `TypingState` are not stored: they only matter while users are connected and are sent live.
- `notificationsEnabled` is not stored: browser notification permission is per device. Only `mention_only` is kept.

> ⚠️ The assignment asked for the Phase 1 diagram as **JPEG**. The repo has `.puml` and `.pdf`; confirm a JPEG was submitted. Phase 2 needs a **physical** model diagram of the tables above.

### 2.5 API

All paths are under `/api/v1`. Successful responses are wrapped in `{ "data": ... }`. Errors are `{ "errors": [{ message, field?, rule?, code? }] }`: `422` for validation, `401` without a valid token, `403`/`404`/`409` with a `code` for channel rules. Every route except register and login needs `Authorization: Bearer <token>`.

| Method | Path | UC | Notes |
|---|---|---|---|
| POST | `/auth/register` | 1 | firstName, lastName, nickName, email, password, passwordConfirmation → `{ user, token }` |
| POST | `/auth/login` | 1 | email, password → `{ user, token }`; wrong credentials are `400` |
| POST | `/auth/logout` | 1 | Deletes the current token |
| GET | `/auth/me` | 1 | The logged-in user |
| PATCH | `/auth/me` | 8, 9 | `{ status?, mentionOnly? }`; pushes the change to the user's other tabs and the new status to their channels |
| GET | `/channels` | 2 | My channels and invitations (`state`: invited/joined), invited first, then by name |
| POST | `/channels/join` | 2, 4 | name, isPrivate? → `201` when created (caller becomes admin), `200` when joined. Private needs an invitation; banned users are refused. Also accepts an invitation. |
| DELETE | `/channels/:id/membership` | 5 | `/cancel` → `204`; the admin leaving deletes the channel. Also declines an invitation. |
| DELETE | `/channels/:id` | 4 | `/quit` → `204`, admin only |
| GET | `/channels/:id/messages` | 7 | `?before=<id>&limit=20` (max 100), newest first, members only |
| POST | `/channels/:id/messages` | 3, 6 | `{ body }` (max 2000 chars) → `201`; stores mentions, updates `last_activity_at` |
| GET | `/channels/:id/members` | 10 | Joined members with status, admin first, members only |
| POST | `/channels/:id/invite` | 4 | `{ nickName }`. Private: admin only. Public: any member. Only the admin can invite a banned user, which lifts the ban and forgets the kicks. |
| POST | `/channels/:id/revoke` | 4 | `{ nickName }`. Private channels, admin only. Removes a member or an invitation; not a ban. |
| POST | `/channels/:id/kick` | 4 | `{ nickName }`. Public channels. A member's kick is one vote; 3 different votes ban. The admin's kick bans at once. The admin can't be kicked. → `{ banned, votes, votesNeeded }` |

**Channel names** are stored in lower case without the leading `#`: letters, digits, `-` and `_`, at most 50 characters. Nicknames in commands may start with `@` and ignore letter case.

**30-day expiry** is checked on access: expired channels are deleted before the list is read and before a join, and an expired channel answers `404` everywhere. No background job.

**WebSocket (Socket.IO):** the client connects with the same token (`auth: { token }`). Data changes go through the REST API; the only client event that is passed on is `typing`, because drafts are never stored.

| Direction | Event | Meaning |
|---|---|---|
| server → user | `ready` | The socket is set up. Sent after every (re)connect and when the user comes back from offline; the client then fetches what it missed. |
| server → channel | `message:new` | A message was posted (UC3) |
| server → channel | `channel:members` | Someone joined, left or was removed; clients reload the member list (UC10) |
| server → channel | `channel:deleted` | The channel stopped existing: `/quit`, the admin's `/cancel`, or expiry (UC2, UC5) |
| server → channel | `user:status` | A member changed their status (UC9) |
| server → channel | `typing` | A member's unsent text; empty means they stopped (UC11) |
| server → user | `channel:invited` | The user was invited (UC2, UC4) |
| server → user | `channel:removed` | The user was revoked or banned (UC4) |
| server → user | `user:updated` | The user changed their settings in another tab |
| client → server | `channel:subscribe` | Join the room of a channel joined after connecting. Membership is checked. |
| client → server | `typing` | `{ channelId, draft }` on every change of the command line (UC11) |

An offline user's sockets are not in any channel room, so they receive no messages, statuses or typing (UC9).

### 2.6 Use-case status (on `main`)

**All 11 use cases are implemented on the backend and connected in the app.**

| UC | Status | Notes |
|---|---|---|
| 1 Accounts | ✅ | Register, login, logout, session restored after a reload, route guard |
| 2 Channel list | ✅ | Joined and invited channels, invitations first and highlighted, create/leave/delete, public/private, 30-day expiry, live updates |
| 3 Command line | ✅ | Messages and commands; `/help` lists the commands |
| 4 Channel commands | ✅ | `/join [private]`, `/invite`, `/revoke`, `/kick` (3 votes or the admin's kick ban), `/quit`; the admin's `/invite` lifts a ban |
| 5 /cancel | ✅ | The admin leaving deletes the channel |
| 6 Mentions | ✅ | The server decides who was mentioned (channel members only); highlighted for that user |
| 7 History | ✅ | Cursor pagination, 20 per page, loaded on scroll up |
| 8 Notifications | ✅ | Only while the app is not visible (Quasar `AppVisibility`); sender and the first 100 characters; mention-only setting saved on the server |
| 9 Status | ✅ | Online/DND/Offline saved on the server and shown live to others. DND: no notifications. Offline: no messages; channels catch up when back online. |
| 10 /list | ✅ | Members with status, admin first; members only |
| 11 Typing / drafts | ✅ | "X is typing"; clicking the name shows the live draft. Drafts are never stored. |

**Interpretation to be ready to explain: what a single `/kick` does.** The spec says a member can "vyhodiť" (kick out) another member, and when at least 3 members do it, the user gets a "trvalý" (permanent) ban. Our app treats a regular member's `/kick` as a **vote**: the user stays in the channel until the third vote, then is banned. Another reading is that each kick removes the user, who may rejoin until the third. Decide which one you defend, or ask at the lab.

Other choices the spec leaves open (document them in Phase 2):

- `/kick` works only in public channels; in private channels the admin uses `/revoke`.
- The admin's kick counts as an immediate ban, not as one vote.
- `/revoke` is not a ban: the user can be invited again.
- Besides invitations first, channels are sorted by name.

### 2.7 Verified on 11 Nov (on `main`, commit `7fcb0b0`)

- **Backend:** `node ace test` passes, **69 of 69**: 6 auth, 16 channels, 13 members (`/invite` `/revoke` `/kick`, including three kicks at the same moment), 10 messages/history/members, 5 live messages, 9 live presence and typing, 3 profile, 7 unit (mentions, ids). `pnpm run typecheck` and `pnpm run lint` pass.
- **Frontend:** `pnpm run typecheck` passes; `oxlint` is clean; **21 of 21** `node:test` tests pass; `quasar build` and `quasar build -m pwa` succeed.
- **Docker:** `docker compose up --build` from the root starts all three containers; the API answers and the frontend loads.
- **Not verified: the app in a real browser** with two users (the checklist in `WEEK9_PLAN.md`), and a browser OS notification.
- **On Windows,** `pnpm run lint:check` in `quasar-project` reports about 40 files. That is only the line endings git uses on Windows checkouts; the committed files are formatted correctly.

### 2.8 Remaining work

**Before the control phase demo (week 9)**

1. **Run the demo checklist** in `WEEK9_PLAN.md` with two users in two browsers, and fix what shows up.
2. **Agree on the `/kick` interpretation** (see 2.6).
3. **Review each other's code.** Commits `5147901` and `7fcb0b0` went to `main` without review. Each of you must be able to explain the whole project, including the parts the other one wrote and the parts AI tools wrote.

**For Phase 2 (due 6 Dec)**

1. **Documentation** (see 1.4): assignment, physical data model with the changes in 2.4, architecture diagram(s), design decisions with a justification per library, at least 5 screenshots.
2. **Screenshots:** the ones in `quasar-project/screenshots/` (used by the README) show the Phase 1 interface; take new ones.
3. **PWA check:** installable, service worker caching, behaviour when offline.
4. **Clean up:** delete the unused starter files (see 2.3).
5. **Source citations:** comments with links for any code adapted from external sources.
6. **Submission ZIP:** without `node_modules/`, `dist/` and any `.env` file (see 2.9).

**Libraries to justify in the documentation:** Socket.IO (server and client) for real-time delivery; `pg` as the PostgreSQL driver. Everything else came with Quasar or the AdonisJS starter kit. HTTP calls use the browser's `fetch`, so no HTTP library was added. Docker is only a convenience for running the app; it is not part of the app.

**Teamwork evidence:** the lecturer looks at the repository. Hand-written lines since the backend work started (no lockfiles, generated files or starter-kit code): about **4,700 by Mykyta** and **2,170 by Zakharii**, so Zakharii should take a bigger share of the remaining work, such as the documentation. Commits: 30 by Mykyta and 11 by Zakharii (under two git names).

### 2.9 Git and workspace notes

- The remote default branch is **`main`**. Local `master` tracks it; update it with `git pull` before working.
- Planned workflow: feature branches (`feat/...`) merged into `main` through pull requests reviewed by the other person. **In practice no change has been reviewed yet:** both pull requests were merged by their own author, and the last four changes were pushed to `main` directly. The spec requires code review between team members.
- Use descriptive commit messages; one large commit named "updt" says nothing to the lecturer.
- `repo.txt` and `Zakharii_Okseniuk_Mykyta_Nosenko.zip` in the repo root are submission files, ignored locally through `.git/info/exclude`. Don't delete or commit them.
- `backend/.env` holds local settings, including database passwords, and is ignored by git. `backend/.env.example` matches the Docker database. A root `.env` (for a fixed `APP_KEY`) is ignored too.
- The submission ZIP must not contain `node_modules/`, `dist/` or any `.env` file.
