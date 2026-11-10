# BeBe Chat — Project Context

> Handoff document for the VPWA semester project.
> Part 1 is the lecturer's assignment ([kurice/vpwa27 › semestralny-projekt](https://github.com/kurice/vpwa27/tree/main/semestralny-projekt)), translated from Slovak and paraphrased.
> Part 2 is what our team has built so far, and what is left.
> Last updated: 2026-11-10.

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
| Database | PostgreSQL 17 in Docker (`backend/docker-compose.yml`, port 5433) |
| Real time | Socket.IO (`socket.io` on the backend, `socket.io-client` on the frontend) |

**Run the backend (from `backend/`, needs Docker Desktop running):**

```bash
pnpm install
docker compose up -d          # PostgreSQL on port 5433 (user/password/database: bebe)
cp .env.example .env          # first time only
node ace generate:key         # first time only
node ace migration:run
pnpm run dev                  # http://localhost:3333, API under /api/v1
node ace test                 # uses the separate bebe_test database, port 3334
pnpm run typecheck && pnpm run lint
```

**Run the frontend (from `quasar-project/`):**

```bash
pnpm install
pnpm exec quasar dev             # dev server with HMR
pnpm run typecheck               # vue-tsc --noEmit
pnpm run lint                    # format + lint (fix)
node --test tests/*.test.mjs     # channels + notifications tests
pnpm exec quasar build
```

The frontend reads the API address from `QCLI_API_URL` (see `quasar-project/.env.example`). The default is `http://localhost:3333/api/v1`; the WebSocket uses the same host and port.

### 2.2 Where the work is

**`main` contains everything.** Start new work from `main`.

| Date | Commit | What reached `main` | How |
|---|---|---|---|
| 9 Nov | `a82b370` | Backend setup, Docker database, migrations (Zakharii) | Pull request #1, merged by its author |
| 10 Nov | `a203171` | UC1 accounts (Zakharii) and messages, history, mentions, /list, live messages (Mykyta) | Mykyta's pull request #2 went into `feat/auth` by mistake; `feat/auth` was then pushed to `main` directly |
| 10 Nov | `4b9cabc` | UC2 channel list, UC5 /cancel, /join and /quit, 30-day expiry (Zakharii) | Pushed to `main` directly, no pull request |

The old branches `feat/backend-setup`, `feat/auth`, `feat/messages` and `feat/channels` are fully contained in `main`.

### 2.3 Code layout

**Backend (`backend/`)**

| Path | Contents |
|---|---|
| `start/routes.ts` | All HTTP routes, under `/api/v1` |
| `start/ws.ts`, `app/services/ws.ts` | Socket.IO server on the same port as HTTP; rooms per channel and per user |
| `app/controllers/` | `new_account`, `access_tokens`, `profile` (UC1); `channels` (UC2, UC4 /join and /quit, UC5); `channel_messages` (UC3, UC6, UC7); `channel_members` (UC10) |
| `app/models/` | `User`, `Channel`, `ChannelUser`, `Kick`, `Message` with relationships |
| `app/services/channel_access.ts` | `isMember()`, `findJoinedChannel()`: the members-only check used by every channel endpoint |
| `app/services/channel_expiry.ts` | `isExpired()`, `removeExpiredChannels()`: the 30-day rule (UC2) |
| `app/services/mentions.ts` | Parses `@nickname` and finds the mentioned channel members |
| `app/validators/` | `user` (signup, login), `channel` (name rules), `message` (body, history query), `id` |
| `app/transformers/` | What the API returns for a user, a channel, a member and a message |
| `app/exceptions/channel_access_exception.ts` | 404 for an unknown channel; 403 for a non-member, a private channel without invitation, a banned user, or a non-admin using /quit |
| `database/migrations/` | 7 migrations (see 2.4) |
| `database/schema.ts` | **Generated** by `node ace migration:run`. Never edit by hand. |
| `tests/functional/`, `tests/unit/` | 44 Japa tests: auth, channels, messages, live updates, mentions, ids |
| `docker-compose.yml`, `docker/init.sql` | Development database, plus the `bebe_test` database |

**Frontend (`quasar-project/`)**

| Path | Contents |
|---|---|
| `src/services/api.ts` | `api()` helper on top of `fetch`; keeps the login token; `ApiError` with per-field errors |
| `src/services/socket.ts` | Socket.IO client: connect with the token; `message:new`, `channel:members`, `channel:deleted`, `channel:subscribe` |
| `src/boot/realtime.ts` | Connects the socket on login and disconnects on logout |
| `src/stores/auth.ts` | Register, login, logout, restore the session after a reload |
| `src/stores/channels.ts` | Channel list, join/create, leave, close from the API. Keeps `chat.channels` in the chat store in step with the backend. |
| `src/stores/messages.ts` | Sending, paged history, members and live messages from the API, kept per channel |
| `src/stores/example-store.ts` | The chat store the page reads. **Still mock:** `/invite`, `/revoke`, `/kick`, presence, notifications, typing. Its mock channel and message code is no longer used by the app. |
| `src/utils/mentions.ts` | Splits a message body into text and highlighted `@nickname` parts |
| `src/pages/index/login.vue`, `registration.vue` | Auth pages, connected to the backend |
| `src/pages/index/main.vue` | Chat UI and command line. `/join`, `/cancel`, `/quit`, `/list` and messages go to the backend. |
| `src/pages/index/settings.vue` | Presence, notification preferences, theme, test controls, logout |
| `src/router/index.ts` | Route guard based on the auth store |
| `src-pwa/` | PWA manifest and service worker |
| `docs/data-model.puml`, `DB.pdf` | Phase 1 logical data model |

`.claude/launch.json` in the repo root holds launch settings for the two dev servers.

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

**Changes since the Phase 1 model** (the Phase 2 documentation must justify these):

- Integer auto-increment ids instead of UUIDs: simpler, and message ids double as the history cursor.
- `Membership.role` dropped: the admin is `channels.owner_id`.
- `Invitation` merged into `channel_users.state = 'invited'`.
- `KickRecord` split into `kicks` (the votes) and `channel_users.state = 'banned'` (the result).
- `Notification` and `TypingState` are not stored: they only matter while users are connected and are sent live.
- `notificationsEnabled` is not stored: browser notification permission is per device. Only `mention_only` is kept.

> ⚠️ The assignment asked for the Phase 1 diagram as **JPEG**. The repo has `.puml` and `.pdf`; confirm a JPEG was submitted. Phase 2 needs a **physical** model diagram of the tables above.

### 2.5 API

All paths are under `/api/v1`. Successful responses are wrapped in `{ "data": ... }`. Validation errors are `422` with `{ "errors": [{ field, rule, message }] }`. Protected routes need `Authorization: Bearer <token>`.

| Status | Method | Path | Notes |
|---|---|---|---|
| ✅ | POST | `/auth/register` | firstName, lastName, nickName, email, password, passwordConfirmation → `{ user, token }` |
| ✅ | POST | `/auth/login` | email, password → `{ user, token }`; wrong credentials are `400` |
| ✅ | POST | `/auth/logout` | Deletes the current token |
| ✅ | GET | `/auth/me` | The logged-in user |
| ✅ | GET | `/channels/:id/messages` | `?before=<id>&limit=20` (max 100), newest first, members only |
| ✅ | POST | `/channels/:id/messages` | `{ body }` (max 2000 chars) → `201`; stores mentions, updates `last_activity_at`, pushes `message:new` |
| ✅ | GET | `/channels/:id/members` | Joined members with status, owner first, members only |
| ✅ | GET | `/channels` | My channels and invitations (`state`: invited/joined), invited first, then by name |
| ✅ | POST | `/channels/join` | name, isPrivate? → `201` when created (caller becomes admin), `200` when joined. Private needs an invitation (`403`); banned users are refused (`403`). Also accepts an invitation. |
| ✅ | DELETE | `/channels/:id/membership` | `/cancel` → `204`; the admin leaving deletes the channel. Also declines an invitation. |
| ✅ | DELETE | `/channels/:id` | `/quit` → `204`, admin only (`403` otherwise) |

**WebSocket (Socket.IO):** the client connects with the same token (`auth: { token }`). The REST API stays the only way to change data; the socket only pushes events.

| Direction | Event | Meaning |
|---|---|---|
| server → client | `ready` | The socket has joined the rooms of the user's channels. Sent after every (re)connect; the client then fetches what it missed. |
| server → client | `message:new` | A message was posted in one of the user's channels |
| server → client | `channel:members` | Someone joined or left a channel; clients reload its member list |
| server → client | `channel:deleted` | A channel stopped existing (closed by its admin, or expired) |
| client → server | `channel:subscribe` | Join the room of a channel joined after connecting. Membership is checked. |

**Channel names** are stored in lower case without the leading `#`: letters, digits, `-` and `_`, at most 50 characters.

**30-day expiry** is checked on access: expired channels are deleted before the list is read and before a join, and an expired channel answers `404` everywhere. No background job.

For UC4 (`/invite`, `/revoke`, `/kick`), `ws.addToChannel(userId, channelId)`, `ws.removeFromChannel(userId, channelId)` and `ws.closeChannel(channelId)` already exist.

### 2.6 Use-case status (on `main`)

| UC | Backend | Frontend | Notes |
|---|---|---|---|
| 1 Accounts | ✅ | ✅ | Register, login, logout, session restored after a reload, route guard. |
| 2 Channel list | ✅ | ✅ | Joined and invited channels from the API, invitations first and highlighted. Create, leave, delete. Public/private. 30-day expiry on access. A closed channel disappears live for its members. |
| 3 Command line / sending | ✅ | ✅ | Members only. Commands are routed in `runCommand()` in `main.vue`. |
| 4 Channel commands | 🟡 Partly | 🟡 Partly | `/join [private]` and `/quit` are done. `/invite`, `/revoke`, `/kick` are not on the backend; the command line answers that they are not connected yet. So nobody can be invited to a private channel yet. |
| 5 /cancel | ✅ | ✅ | Leaves the channel; the admin leaving deletes it. |
| 6 Mentions | ✅ | ✅ | The server decides who was mentioned (channel members only); the frontend highlights from that list. |
| 7 History | ✅ | ✅ | Cursor pagination, 20 per page, loaded on scroll up. |
| 8 Notifications | ❌ | 🟡 Partial | Browser notification when hidden; in-app toast when visible. Live messages from others already count as unread and can raise one. Uses the DOM visibility API, not Quasar AppVisibility. `mention_only` isn't saved to the server yet. |
| 9 Status | 🟡 Column only | 🟡 Mock | `users.status` exists and is returned with members; no endpoint to change it, no live broadcast. |
| 10 /list | ✅ | ✅ | Members with status; non-members get 403. |
| 11 Typing / drafts | ❌ | 🟡 Mock | Local only. Needs socket events. |
| Live messages | ✅ | ✅ | New messages are pushed over Socket.IO, with catch-up after a reconnect. |

**For the week 9 demo:** 7 use cases are on the backend end to end: 1, 2, 3, 5, 6, 7 and 10. The minimum is 6.

**Known gaps after this change**

- The demo buttons in Settings ("test message", "scheduled message") add a message to the old mock list, which the chat page no longer shows for backend channels. The notification itself still appears.
- `main.vue` still contains the branches for mock channels (`isServerChannel()`); they are no longer reached and can be removed when `example-store.ts` is split.

### 2.7 Verified on 10 Nov (on `main`, commit `4b9cabc`)

- Backend: `node ace test` passes, **44 of 44**: 6 auth, 16 channels (list, join, leave, quit, expiry, live updates), 10 messages/history/members, 5 live messages, 7 unit tests (mentions, ids). `pnpm run typecheck` and `pnpm run lint` pass.
- Frontend: `pnpm run typecheck` passes; `oxlint src` is clean; the 16 existing `node:test` tests pass; `quasar build` succeeds.
- **Not verified: the pages in a real browser.** The channel list, create dialog and commands were only checked by type check and build. Also not verified: and a browser OS notification (permission was denied in the browser used for testing).
- Known: `oxlint` reports 16 errors in `quasar-project/tests/*.test.mjs` (promises without `await`/`void`). They predate the backend work.

### 2.8 Remaining work

**Before the week 9 demo**

1. **Try everything in a browser** and fix what shows up. Nothing since UC1 has been clicked through in a real browser yet.
2. **Mykyta reviews `4b9cabc`.** It went to `main` without a review and changes four of his files (`ws.ts`, `channel_access.ts`, `socket.ts`, `realtime.ts`). He should pull `main` before continuing.
3. **Test together** in two browsers with two users, following the checklist in `WEEK9_PLAN.md`.

**For Phase 2 (due 6 Dec)**

1. **UC4:** `/invite`, `/revoke`, `/kick` with the 3-vote ban and admin override, enforced on the server.
2. **UC9:** endpoint to change status, live broadcast to other members; offline users receive nothing and refetch when back online.
3. **UC8:** use Quasar `AppVisibility`; save `mention_only` on the server.
4. **UC11:** typing and draft events over the socket; clicking a nickname shows the live draft.
5. **Invitations arriving live:** an invited user currently sees the invitation only after a reload or reconnect.
6. **Remove the mock store** once every use case is on the backend. `login()` and `register()` in `example-store.ts` are already unused.
7. **PWA check:** installable, service worker caching, behaviour when offline.
8. **Documentation** (see 1.4): assignment, physical data model with the changes in 2.4, architecture diagram(s), design decisions with a justification per library, at least 5 screenshots.
9. **README:** the root README still lists an "Away" status and doesn't mention `/quit`, `/cancel` or `/list`. It also has no backend instructions; those are in `backend/README.md`.
10. **Source citations:** comments with links for any code adapted from external sources.

**Libraries to justify in the documentation so far:** Socket.IO (server and client) for real-time delivery; `pg` as the PostgreSQL driver. Everything else came with Quasar or the AdonisJS starter kit. HTTP calls use the browser's `fetch`, so no HTTP library was added.

**Teamwork evidence:** non-merge commits are 29 by Mykyta and 9 by Zakharii (under two git names), but commits differ a lot in size. Hand-written lines since the backend work started (no lockfiles, generated files or starter-kit code): about **2,070 by Zakharii** and **1,840 by Mykyta**, so the amount of code is roughly balanced. Both counts include tests.

### 2.9 Git and workspace notes

- The remote default branch is **`main`**. Local `master` tracks it; update it with `git pull` before branching.
- Planned workflow: feature branches (`feat/...`) merged into `main` through pull requests reviewed by the other person. **In practice no change has been reviewed yet:** both pull requests were merged by their own author, and the last two changes were pushed to `main` directly. The spec requires code review between team members and the lecturer looks at the repository, so review at least the next changes properly.
- When opening a pull request, check that its base branch is `main` (pull request #2 accidentally targeted `feat/auth`).
- `repo.txt` and `Zakharii_Okseniuk_Mykyta_Nosenko.zip` in the repo root are submission files, ignored locally through `.git/info/exclude`. Don't delete or commit them.
- `backend/.env` holds local settings and is ignored by git. `backend/.env.example` matches the Docker database.
- The submission ZIP must not contain `node_modules/` or `dist/`.
