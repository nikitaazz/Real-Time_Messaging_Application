# BeBe Chat — Project Context

> Handoff document for the VPWA semester project.
> Part 1 is the lecturer's assignment ([kurice/vpwa27 › semestralny-projekt](https://github.com/kurice/vpwa27/tree/main/semestralny-projekt)), translated from Slovak and paraphrased.
> Part 2 is what our team has built so far, and what is left.
> Last updated: 2026-11-09.

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
| Local path | `D:\VPWA` (app in `D:\VPWA\quasar-project`) |
| Stack so far | Vue 3, Quasar 2 (Vite), TypeScript, Pinia, file-based Vue Router, PWA service worker, oxlint/oxfmt, `node:test` |

**Run (from `quasar-project/`):**

```bash
pnpm install          # or npm install
pnpm exec quasar dev  # dev server with HMR
pnpm run lint         # format + lint (fix)
pnpm run lint:check   # format + lint (check only)
pnpm run typecheck    # vue-tsc --noEmit
pnpm exec quasar build
node --test tests/*.test.mjs   # channels + notifications tests
```

### 2.2 Code layout

| Path | Contents |
|---|---|
| `src/stores/example-store.ts` | Main Pinia store (~700 lines): users, channels, messages, commands, presence, notifications, typing. **All state is mock and local.** |
| `src/pages/index/login.vue`, `registration.vue` | Auth screens (mock) |
| `src/pages/index/main.vue` | Main chat UI: channel list, message list with history loading, command line, member list |
| `src/pages/index/settings.vue` | Presence, notification preferences, theme, notification test controls |
| `src/App.vue` | Root, including the in-app notification toast |
| `src/composables/useTheme.ts` | Theme switching |
| `src-pwa/` | PWA manifest, service-worker registration, custom service worker |
| `docs/data-model.puml` | Phase 1 logical data model (PlantUML) |
| `DB.pdf` | Data model diagram as PDF |
| `tests/channels.test.mjs`, `tests/notifications.test.mjs` | `node:test` unit tests |
| `screenshots/` | Screenshots used in the README |

### 2.3 Phase 1 data model (`docs/data-model.puml`)

Entities: **User** (email, firstName, lastName, nickName unique, presence, notificationsEnabled, mentionOnly), **Channel** (name unique, visibility, ownerId, lastActivityAt), **Membership** (role owner/member, joinedAt), **Message**, **Mention**, **Notification**, **TypingState**, **KickRecord** (kickedBy, permanent), **Invitation** (invitedBy, invitedAt, revokedAt).

Rules recorded as notes in the diagram:
- Anyone can join a public channel; private channels require an invitation.
- A channel is removed after 30 days without a new message.
- 3 distinct members can permanently ban someone from a public channel. The owner can ban or restore directly.
- Notifications require the app to be hidden and respect DND, Offline and the mention-only setting.

> ⚠️ The assignment asks for the Phase 1 diagram as **JPEG**. We have `.puml` and `.pdf`; confirm a JPEG export was submitted.

### 2.4 What is implemented (frontend prototype)

The app is a **frontend-only prototype on mock Pinia state**. Every flow below works in a single browser, with no server.

| UC | Status | Notes |
|---|---|---|
| 1 Accounts | 🟡 Mock | Login, registration and logout screens. No server-side accounts or password storage. |
| 2 Channel list | 🟡 Mostly | Public/private channels, create, leave, delete, accept/reject invitations. Channels have `lastActivity`, but **30-day expiry is not enforced**. |
| 3 Command line | ✅ UI | Fixed input. Messages and commands are routed in `runCommand()`. |
| 4 Channel commands | 🟡 Local | `/join [private]`, `/invite`, `/revoke`, `/kick` (with kick records, permanent ban, admin restore via `/invite`), `/quit` (owner only). Rules are checked only on the client. |
| 5 /cancel | ✅ Local | Leaves the channel; owner leaving deletes it. |
| 6 Mentions | ✅ Local | `@nickname` is parsed and highlighted. |
| 7 History | 🟡 Mock | Scroll to top loads older mock messages and keeps the scroll position. No paginated backend. |
| 8 Notifications | 🟡 Partial | Browser `Notification` when `document.visibilityState` is hidden, respecting presence and the mention-only setting. An in-app toast (stays until Open or Dismiss) when the app is visible. Uses the DOM visibility API, not the Quasar AppVisibility plugin. |
| 9 Status | 🟡 Local | Online / DND / Offline selector. DND suppresses notifications; Offline blocks delivery. Other users can't see it (no server). |
| 10 /list | ✅ Local | Shows members only if the user is a member. A member panel is also in the UI. |
| 11 Typing / drafts | 🟡 Local | `setTyping(draft)` tracks local draft state. **Not shared between users.** |

Other features:
- Responsive layout. On phones the channel list appears first, and selecting a channel opens the conversation.
- Theme switching.
- Test controls in settings: instant mock incoming message, scheduled demo message, direct browser notification test.
- PWA manifest and service worker present.

### 2.5 Recent verified changes

- The in-app notification toast now stays visible until the user picks **Open** or **Dismiss**. `pnpm run typecheck` and the production build passed, and the toast was verified to still be visible after 10 seconds.
- In the browser used for testing, notification permission was **denied**, so the OS-level notification couldn't be verified. Grant permission and test again.

### 2.6 Remaining work for Phase 2 (due 6 Dec)

Biggest gap: **there is no backend.** Phase 2 requires AdonisJS + PostgreSQL/MySQL with migrations.

1. **Backend (AdonisJS)**
   - Create the AdonisJS app (for example a `backend/` folder next to `quasar-project/`).
   - **Migrations** for all entities in the data model (users, channels, memberships, messages, mentions, invitations, kick records). Notification and TypingState can stay runtime-only if justified in the docs.
   - Real auth: registration, login, logout, password hashing, tokens. Unique nickname and email.
   - REST endpoints, or socket events, for channels, membership commands and message history with **cursor pagination**.
   - **Real-time transport** (WebSocket / Socket.IO via an Adonis package) for messages, invitations, kicks, presence, typing and drafts.
   - Server-side enforcement of every rule in UC4/UC5: private vs public, admin-only actions, 3-kick ban, admin restore, unique channel names.
   - **30-day expiry** as a scheduled job or a check on access, freeing the channel name.
   - Offline users don't receive messages; on returning Online, the client refetches its channels and messages.
2. **Frontend**
   - Replace mock state in `example-store.ts` with API and socket calls. Consider splitting the store into auth, channels, messages and presence.
   - Use **`q-infinite-scroll`** (or keep the custom loader) over real paginated history.
   - Use **Quasar `AppVisibility`** for notification visibility checks, as the spec names it.
   - Broadcast typing and drafts; clicking a nickname in the typing bar shows their live draft.
   - Show other users' status in member lists.
3. **Documentation** (see 1.4): assignment, physical data model with changes since Phase 1, architecture diagram(s), design decisions with library justifications, at least 5 screenshots.
4. **README cleanup**: the command list is missing `/quit`, `/cancel` and `/list`, and the status section lists **"Away"**, which the spec doesn't have. It should be Online / DND / Offline.
5. **Teamwork evidence**: commits are currently uneven (most by one author). Both members should commit regularly and review each other's code.
6. **Source citations**: add comments with links for any code adapted from external sources.

### 2.7 Git and workspace notes

- Local branch is **`master`**; the remote default branch is **`main`**. To push: `git push origin master:main`.
- Always check `git status`, `git log` and `git log origin/main` before syncing.
- `repo.txt` and `Zakharii_Okseniuk_Mykyta_Nosenko.zip` in the repo root are **untracked submission files**. Don't delete or commit them without asking.
- The submission ZIP must not contain `node_modules/` or `dist/`.
