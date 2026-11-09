# Week 9 Plan: Control Phase

**Goal:** at least 6 of the 11 use cases working on a real backend (AdonisJS + PostgreSQL). We aim for 7 so one failure doesn't sink us.

**Target use cases:** UC1 accounts · UC2 channel list · UC3 sending messages · UC5 `/cancel` · UC6 mentions · UC7 history · UC10 `/list`

**How we split:** each person owns whole use cases, backend *and* frontend. That keeps the amount of code similar, and each of us has to understand both halves of the stack, which the lecturer requires.

---

## Zakharii

### 1. Backend setup (first, others depend on it)
- Create the AdonisJS app in `backend/` next to `quasar-project/`.
- Connect PostgreSQL. Add `.env.example` and enable CORS for the Quasar dev server.
- Add run instructions for the backend to `README.md`.

### 2. Migrations + models (whole data model at once)
- `users`: first_name, last_name, nick_name (unique), email (unique), password, status (online/dnd/offline), mention_only
- `auth_access_tokens`
- `channels`: name (unique), is_private, owner_id, last_activity_at
- `channel_users`: user_id, channel_id, role (owner/member), state (invited/joined/banned), invited_by, joined_at
- `kicks`: channel_id, target_id, kicked_by. Unused until UC4, but it belongs in the schema now.
- `messages`: channel_id, author_id, body, created_at
- `mentions`: message_id, user_id

### 3. UC1 Accounts (full stack)
- Backend: register, login, logout, me. VineJS validation with unique nickname and email; access tokens.
- Frontend: `stores/auth.ts`; connect `login.vue` and `registration.vue`; route guard (no access to the chat without logging in); logout button.

### 4. UC2 + UC5 Channels (full stack)
- Backend: list my channels (invitations first), join or create (basic `/join name [private]`), leave (`/cancel`; the owner leaving deletes the channel), delete (`/quit`, owner only).
- Frontend: `stores/channels.ts`; connect the channel list, the create dialog, and leave/delete; handle `/join`, `/cancel` and `/quit` in the command line.

---

## Mykyta

### 1. Frontend API layer (start immediately, no backend needed)
- `src/boot/api.ts`: HTTP client with a base URL from env and the auth token in the header. On a 401 response, log out.
- Start breaking up `example-store.ts`: create `stores/messages.ts` and move the message logic into it.

### 2. UC3 Sending messages (full stack)
- Backend: `POST /channels/:id/messages`. Only members may post. Updates `channels.last_activity_at`.
- Frontend: the command line sends real messages instead of mock ones.

### 3. UC7 History (full stack)
- Backend: `GET /channels/:id/messages?before=<id>&limit=20` (cursor pagination, newest first).
- Frontend: scroll up loads older pages from the API (keep the existing scroll-position logic, or switch to `q-infinite-scroll`).

### 4. UC6 Mentions (full stack)
- Backend: when a message is saved, find `@nickname`s and insert rows into `mentions`. Return the mentioned nicknames with each message.
- Frontend: highlight messages that mention the logged-in user.

### 5. UC10 `/list` (full stack)
- Backend: `GET /channels/:id/members`. Members only; returns nickname and status.
- Frontend: `/list` command output and the member panel use real data.

### 6. Bonus: live messages
- WebSocket broadcast of new messages to channel members, so a second browser sees them without refreshing. Needed later for UC8, UC9 and UC11, and it makes the demo much stronger.

---

## API contract (agree on it before coding so we can work in parallel)

| Owner | Method | Path | Body / query | Returns |
|---|---|---|---|---|
| Z | POST | `/auth/register` | firstName, lastName, nickName, email, password | `{ user, token }` |
| Z | POST | `/auth/login` | email, password | `{ user, token }` |
| Z | POST | `/auth/logout` | – | 204 |
| Z | GET | `/auth/me` | – | `user` |
| Z | GET | `/channels` | – | my channels + invitations (invited first) |
| Z | POST | `/channels/join` | name, isPrivate? | channel (joined or created) |
| Z | DELETE | `/channels/:id/membership` | – | 204 (`/cancel`; owner → channel deleted) |
| Z | DELETE | `/channels/:id` | – | 204 (`/quit`, owner only) |
| M | GET | `/channels/:id/messages` | `?before=<id>&limit=20` | messages, newest first |
| M | POST | `/channels/:id/messages` | body | message (with mentions) |
| M | GET | `/channels/:id/members` | – | members with status |

## Order and dependencies

1. **Day 1:** Z pushes the backend setup and migrations as early as possible. M works on the API layer and store split in parallel.
2. Z merges auth. After that, M's endpoints can use the auth middleware.
3. Z works on channels while M works on messages, history, mentions and list.
4. **Day before the lab:** test together with two users in two browsers, going through every target use case.

## Working rules

- One branch per feature (`feat/auth`, `feat/messages`, …) and a pull request into `main`. **The other person reviews and merges.** The spec requires code review between us.
- Keep pull requests small, especially ones touching `main.vue`, since we both edit it.
- Each person commits from their own account.
- Cite any copied code from the internet in a comment with a link.

## Demo checklist (week 9)

- [ ] Register two users; log in and out (UC1)
- [ ] Create a public and a private channel; leave one; owner deletes one (UC2, UC5)
- [ ] Send messages between the two users (UC3)
- [ ] Scroll up to load older history (UC7)
- [ ] `@nick` highlights the message for that user (UC6)
- [ ] `/list` shows members (UC10)
