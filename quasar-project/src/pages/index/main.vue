<template>
  <q-page class="chat-page">
    <div
      class="chat-shell"
      :class="{
        'members-open': membersOpen,
        'mobile-conversation-open': isMobile && mobileConversationVisible
      }"
    >
      <!-- UC2: the channel list -->
      <aside class="channel-panel">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-h6 text-weight-bold">BeBe</div>
            <div class="text-caption text-grey-6">Your conversations</div>
          </div>
          <q-btn
            round
            flat
            icon="add"
            aria-label="Create channel"
            @click="channelDialog = true"
          >
            <q-tooltip>Create channel</q-tooltip>
          </q-btn>
        </div>
        <q-input
          v-model="search"
          dense
          outlined
          placeholder="Search channels"
          clearable
          class="q-mb-md"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <div class="text-overline text-grey-6">Channels</div>
        <q-list class="channel-list">
          <q-item
            v-for="channel in filteredChannels"
            :key="channel.id"
            clickable
            :active="channel.id === channels.selectedId"
            active-class="channel-active"
            :class="{ 'channel-invited': channel.state === 'invited' }"
            @click="openChannel(channel)"
          >
            <q-item-section avatar>
              <q-icon :name="channel.isPrivate ? 'lock' : 'tag'" size="18px" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ channel.name }}</q-item-label>
              <q-item-label caption>{{ channelCaption(channel) }}</q-item-label>
            </q-item-section>
            <q-item-section
              v-if="channels.unread[channel.id]"
              side
              class="channel-unread"
            >
              <q-badge
                color="primary"
                :label="channels.unread[channel.id]"
                rounded
              />
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                :icon="channel.state === 'invited' ? 'close' : 'more_vert'"
                :aria-label="channelActionLabel(channel)"
                @click.stop="
                  channel.state === 'invited'
                    ? leaveChannel(channel)
                    : confirmLeave(channel)
                "
              >
                <q-tooltip>{{ channelActionLabel(channel) }}</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
          <div
            v-if="channels.loaded && !filteredChannels.length"
            class="text-caption text-grey-6 q-pa-sm"
          >
            No channels here. Create one with + or type /join channelName.
          </div>
        </q-list>
        <q-space />
        <q-separator class="q-my-md" />
        <div class="row items-center no-wrap">
          <q-avatar color="primary" text-color="white" size="36px">
            {{ initials }}
          </q-avatar>
          <div class="q-ml-sm ellipsis">
            <div class="text-weight-medium ellipsis">
              {{ auth.user?.nickName }}
            </div>
            <!-- UC9: the user's own status, changed from this menu or in Settings -->
            <button
              type="button"
              class="status-button"
              aria-label="Change status"
            >
              <span :class="`status-dot status-${status}`" />
              {{ STATUS_LABELS[status] }}
              <q-icon name="expand_more" size="14px" />
              <q-menu anchor="top left" self="bottom left">
                <q-list dense style="min-width: 150px">
                  <q-item
                    v-for="option in statusOptions"
                    :key="option"
                    v-close-popup
                    clickable
                    :active="option === status"
                    @click="setStatus(option)"
                  >
                    <q-item-section side>
                      <span :class="`status-dot status-${option}`" />
                    </q-item-section>
                    <q-item-section>{{ STATUS_LABELS[option] }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </button>
          </div>
          <q-btn
            class="q-ml-auto"
            flat
            round
            icon="settings"
            to="/settings"
            aria-label="Settings"
          />
          <q-btn
            flat
            round
            :icon="isDark ? 'light_mode' : 'dark_mode'"
            aria-label="Toggle theme"
            @click="toggleTheme"
          />
        </div>
      </aside>

      <section class="conversation">
        <header class="conversation-header row items-center justify-between">
          <q-btn
            flat
            round
            icon="arrow_back"
            class="mobile-back"
            aria-label="Back to conversations"
            @click="mobileConversationVisible = false"
          />
          <div>
            <div class="text-h6">
              {{ selected ? `# ${selected.name}` : "No channel selected" }}
            </div>
            <div v-if="selected" class="text-caption text-grey-6">
              {{ channelCaption(selected) }}
            </div>
          </div>
          <div class="row items-center q-gutter-xs">
            <q-btn
              flat
              round
              icon="group"
              :disable="!selected"
              aria-label="Members"
              @click="membersOpen = !membersOpen"
            >
              <q-tooltip>Members</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              icon="logout"
              :disable="!selected"
              :aria-label="selected ? channelActionLabel(selected) : 'Leave'"
              @click="selected && confirmLeave(selected)"
            >
              <q-tooltip v-if="selected">
                {{ channelActionLabel(selected) }}
              </q-tooltip>
            </q-btn>
          </div>
        </header>

        <!-- UC9: an offline user gets no messages -->
        <q-banner v-if="auth.isOffline" dense class="offline-banner">
          <template #avatar><q-icon name="cloud_off" /></template>
          Your status is Offline, so new messages are not delivered to you. Go
          online to bring your channels up to date.
          <template #action>
            <q-btn flat label="Go online" @click="setStatus('online')" />
          </template>
        </q-banner>
        <!-- The answer to the last command, or an error -->
        <q-banner
          v-if="channels.notice"
          dense
          class="command-banner"
          role="status"
        >
          {{ channels.notice }}
          <template #action>
            <q-btn flat label="Clear" @click="channels.notice = ''" />
          </template>
        </q-banner>

        <!-- UC7: the message history, older pages are loaded while scrolling up -->
        <div ref="messageScroll" class="message-scroll" @scroll="onScroll">
          <div v-if="!selected" class="text-center text-grey-7 q-pa-lg">
            Join or create a channel to start chatting.
          </div>
          <template v-else>
            <div
              v-if="loadingOlder"
              class="text-center text-caption text-grey q-pa-sm"
            >
              Loading older messages...
            </div>
            <q-btn
              v-else-if="canLoadMore"
              flat
              color="primary"
              label="Load earlier messages"
              class="full-width q-mb-md"
              @click="loadHistory"
            />
            <div
              v-else-if="historyLoaded"
              class="text-center text-caption text-grey-6 q-pa-sm"
            >
              This is the beginning of #{{ selected.name }}
            </div>
            <div
              v-for="message in visibleMessages"
              :key="message.id"
              class="message-row"
              :class="{ 'message-addressed': message.addressedToMe }"
            >
              <q-avatar size="34px" color="secondary" text-color="white">
                {{ message.author.slice(0, 1).toUpperCase() }}
              </q-avatar>
              <div class="message-content">
                <div>
                  <strong>{{ message.author }}</strong>
                  <span class="text-caption text-grey-6 q-ml-sm">
                    {{ message.time }}
                  </span>
                </div>
                <!-- UC6: "@nickname" parts are highlighted; rendered as text, never as HTML -->
                <div class="message-bubble">
                  <template v-for="(part, index) in message.parts" :key="index">
                    <mark v-if="part.mention">{{ part.text }}</mark>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- UC11: who is writing; a click on a name shows the text as it is typed -->
        <div v-if="watchedTypist" class="draft-preview" role="status">
          <div class="draft-preview-text">
            <strong>{{ watchedTypist.nickName }}</strong> is writing:
            <span class="draft-preview-body">{{ watchedTypist.draft }}</span>
          </div>
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="close"
            aria-label="Hide the text being written"
            @click="watchedTypistId = null"
          />
        </div>
        <div v-if="typists.length" class="typing text-caption" role="status">
          <template v-for="(typist, index) in typists" :key="typist.userId">
            <span v-if="index > 0">, </span>
            <button
              type="button"
              class="typing-name"
              :class="{
                'typing-name-active': typist.userId === watchedTypistId
              }"
              :title="`See what ${typist.nickName} is writing`"
              @click="toggleDraftPreview(typist.userId)"
            >
              {{ typist.nickName }}
            </button>
          </template>
          {{ typists.length === 1 ? " is typing..." : " are typing..." }}
        </div>

        <!-- UC3: the command line, always at the bottom of the window -->
        <footer class="composer">
          <q-input
            v-model="composer"
            outlined
            dense
            maxlength="2000"
            :placeholder="composerPlaceholder"
            aria-label="Message or command"
            @keydown.enter.exact.prevent="send"
          >
            <template #prepend><q-icon name="chat_bubble_outline" /></template>
            <template #append>
              <q-btn
                flat
                round
                icon="send"
                color="primary"
                aria-label="Send"
                :disable="!canSend"
                @click="send"
              />
            </template>
          </q-input>
          <div class="text-caption text-grey-6 q-mt-xs">
            Commands: /join /invite /revoke /kick /quit /cancel /list /help
          </div>
        </footer>
      </section>

      <!-- UC10: the members of the open channel with their status (UC9) -->
      <aside v-if="membersOpen" class="member-panel">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold">
            Members
            <span class="text-caption text-grey-6">({{ members.length }})</span>
          </div>
          <q-btn
            flat
            round
            dense
            icon="close"
            class="member-close"
            aria-label="Close members"
            @click="membersOpen = false"
          />
        </div>
        <q-item v-for="member in members" :key="member.id" class="q-px-none">
          <q-item-section avatar>
            <q-avatar size="32px" color="secondary" text-color="white">
              {{ member.nickName.slice(0, 1).toUpperCase() }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ member.nickName }}
              <q-badge
                v-if="member.id === selected?.ownerId"
                outline
                color="primary"
                label="admin"
                class="q-ml-xs"
              />
            </q-item-label>
            <q-item-label caption class="member-name">
              {{ member.firstName }} {{ member.lastName }}
            </q-item-label>
            <q-item-label caption class="member-status">
              <span :class="`status-dot status-${member.status}`" />
              {{ STATUS_LABELS[member.status] }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </aside>
    </div>

    <q-dialog v-model="channelDialog">
      <q-card class="q-pa-md" style="min-width: 320px">
        <div class="text-h6 q-mb-md">Create a channel</div>
        <q-input
          v-model="newChannel"
          label="Channel name"
          outlined
          class="q-mb-md"
          :error="!!channelError"
          :error-message="channelError"
          autofocus
          @update:model-value="channelError = ''"
          @keydown.enter.exact.prevent="createChannel"
        />
        <q-toggle v-model="privateChannel" label="Private channel" />
        <div class="row justify-end q-gutter-sm q-mt-md">
          <q-btn v-close-popup flat label="Cancel" />
          <q-btn
            color="primary"
            label="Create"
            :loading="creatingChannel"
            :disable="!newChannel.trim()"
            @click="createChannel"
          />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useQuasar } from "quasar";
import { STATUS_LABELS, useAuthStore, type Status } from "@/stores/auth";
import { useChannelsStore, type ServerChannel } from "@/stores/channels";
import { useMessagesStore, type ServerMessage } from "@/stores/messages";
import { useTypingStore } from "@/stores/typing";
import { ApiError } from "@/services/api";
import { COMMAND_HELP, parseCommand } from "@/utils/commands";
import { splitMentions, type MessagePart } from "@/utils/mentions";
import { useTheme } from "@/composables/useTheme";

/** A message prepared for the message list. */
interface MessageView {
  id: number;
  author: string;
  time: string;
  /** The body as plain text and highlighted "@nickname" pieces (UC6) */
  parts: MessagePart[];
  /** The message mentions the logged-in user (UC6) */
  addressedToMe: boolean;
}

const auth = useAuthStore();
const channels = useChannelsStore();
const messages = useMessagesStore();
const typing = useTypingStore();
const { isDark, toggleTheme } = useTheme();
const $q = useQuasar();

const isMobile = computed(() => $q.screen.width <= 640);
const search = ref("");
const composer = ref("");
const channelDialog = ref(false);
const newChannel = ref("");
const channelError = ref("");
const privateChannel = ref(false);
const creatingChannel = ref(false);
const membersOpen = ref($q.screen.width > 900);
const mobileConversationVisible = ref(false);
const loadingOlder = ref(false);
const messageScroll = ref<HTMLElement | null>(null);
/** UC11: the member whose unsent text is shown, chosen by clicking their name. */
const watchedTypistId = ref<number | null>(null);

const statusOptions: Status[] = ["online", "dnd", "offline"];
const status = computed<Status>(() => auth.user?.status ?? "offline");
const initials = computed(() =>
  (auth.user?.nickName ?? "?").slice(0, 1).toUpperCase()
);

/** The open channel; null when the user has not joined any channel. */
const selected = computed(() => channels.selected);
const filteredChannels = computed(() =>
  channels.sorted.filter(channel =>
    channel.name.includes((search.value ?? "").trim().toLowerCase())
  )
);
const visibleMessages = computed<MessageView[]>(() =>
  selected.value
    ? messages.messagesFor(selected.value.id).map(toMessageView)
    : []
);
const historyLoaded = computed(
  () => !!selected.value && !!messages.histories[selected.value.id]?.loaded
);
const canLoadMore = computed(
  () =>
    historyLoaded.value &&
    !!selected.value &&
    messages.hasMoreFor(selected.value.id)
);
const members = computed(() =>
  selected.value ? messages.membersFor(selected.value.id) : []
);
const typists = computed(() =>
  selected.value ? typing.typistsIn(selected.value.id) : []
);
const watchedTypist = computed(
  () =>
    typists.value.find(typist => typist.userId === watchedTypistId.value) ??
    null
);
const isCommand = computed(() => composer.value.trim().startsWith("/"));
const canSend = computed(
  () => !!composer.value.trim() && (isCommand.value || !!selected.value)
);
const composerPlaceholder = computed(() => {
  if (!selected.value) return "Use /join channelName to get started";
  if (auth.isOffline) return "You are offline. Go online to send messages.";
  return `Message #${selected.value.name}, or type / for a command`;
});

function channelCaption(channel: ServerChannel) {
  if (channel.state === "invited") return "Invitation - select to join";
  const type = channel.isPrivate ? "Private channel" : "Public channel";
  return channel.ownerId === auth.user?.id ? `${type} · admin` : type;
}
/** What the button next to a channel does (UC2): decline, leave, or delete as the admin. */
function channelActionLabel(channel: ServerChannel) {
  if (channel.state === "invited") return "Decline invitation";
  return channel.ownerId === auth.user?.id ? "Delete channel" : "Leave channel";
}
function formatTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${date.toLocaleDateString()} ${time}`;
}
function toMessageView(message: ServerMessage): MessageView {
  const myNickName = auth.user?.nickName.toLowerCase();
  return {
    id: message.id,
    author: message.author,
    time: formatTime(message.createdAt),
    parts: splitMentions(message.body, message.mentions),
    addressedToMe: message.mentions.some(
      name => name.toLowerCase() === myNickName
    )
  };
}
function showError(error: unknown) {
  channels.notice =
    error instanceof ApiError ? error.message : "Something went wrong.";
}
function scrollToBottom() {
  const scrollElement = messageScroll.value;
  if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
}

// Opening a channel loads its newest messages (UC7) and members (UC10)
watch(
  () => selected.value?.id,
  async channelId => {
    watchedTypistId.value = null;
    if (channelId === undefined) return;
    try {
      await messages.open(channelId);
    } catch (error) {
      showError(error);
    }
  },
  { immediate: true }
);

// Switching to another channel shows its newest messages
watch(() => selected.value?.id, scrollToBottom, { flush: "post" });

// A new message at the end (loaded, sent or received live) scrolls down,
// unless the user has scrolled up to read older messages
watch(
  () => visibleMessages.value.at(-1)?.id,
  async () => {
    const scrollElement = messageScroll.value;
    if (!scrollElement) return;
    // Measured before the new message is rendered
    const nearBottom =
      scrollElement.scrollHeight -
        scrollElement.scrollTop -
        scrollElement.clientHeight <
      150;
    await nextTick();
    if (nearBottom) scrollToBottom();
  }
);

// UC11: every change of the command line is sent to the members of the open channel
watch([() => selected.value?.id ?? null, composer], ([channelId, text]) =>
  typing.setDraft(channelId, text)
);
onBeforeUnmount(() => typing.setDraft(null, ""));

function toggleDraftPreview(userId: number) {
  watchedTypistId.value = watchedTypistId.value === userId ? null : userId;
}

/** UC9: changes the user's own status. */
async function setStatus(value: Status) {
  try {
    await auth.updateSettings({ status: value });
  } catch (error) {
    showError(error);
  }
}

async function openChannel(channel: ServerChannel) {
  // Selecting an invitation accepts it (UC2)
  if (channel.state === "invited") await joinChannel(channel.name);
  else channels.select(channel.id);
  if (channels.selectedId === channel.id)
    mobileConversationVisible.value = true;
}

/** UC3: the command line sends a message, or runs a command when the text starts with "/". */
async function send() {
  const text = composer.value.trim();
  if (!text) return;
  if (text.startsWith("/")) {
    composer.value = "";
    await runCommand(text);
    return;
  }

  const channel = selected.value;
  if (!channel) return;
  if (auth.isOffline) {
    channels.notice = "You are offline. Go online to send messages.";
    return;
  }
  composer.value = "";
  try {
    await messages.send(channel.id, text);
    await nextTick();
    scrollToBottom();
  } catch (error) {
    // Put the text back, unless the user has already started typing something else
    if (!composer.value) composer.value = text;
    showError(error);
  }
}

/** UC7: loads older messages and keeps the messages on screen in place. */
async function loadHistory() {
  const scrollElement = messageScroll.value;
  const channel = selected.value;
  if (!scrollElement || !channel || loadingOlder.value || !canLoadMore.value)
    return;
  const previousHeight = scrollElement.scrollHeight;
  const previousTop = scrollElement.scrollTop;
  loadingOlder.value = true;
  try {
    await messages.loadOlder(channel.id);
    await nextTick();
    // The new messages were added above: move down by their height
    if (messageScroll.value)
      messageScroll.value.scrollTop =
        previousTop + messageScroll.value.scrollHeight - previousHeight;
  } catch (error) {
    showError(error);
  } finally {
    loadingOlder.value = false;
  }
}
function onScroll(event: Event) {
  if ((event.target as HTMLElement).scrollTop < 20) void loadHistory();
}

/** Readable text for an error of the channel endpoints. */
function channelErrorText(error: unknown) {
  if (error instanceof ApiError && error.status === 422)
    return "Use only letters, digits, - and _ (at most 50 characters).";
  return error instanceof ApiError ? error.message : "Something went wrong.";
}
/**
 * UC4: joins the channel with this name; the server creates it when the name
 * is free. Returns the channel, or null when the server refused.
 */
async function joinChannel(name: string, isPrivate = false) {
  try {
    const channel = await channels.join(name, isPrivate);
    channels.notice = "";
    mobileConversationVisible.value = true;
    return channel;
  } catch (error) {
    channels.notice = channelErrorText(error);
    return null;
  }
}
/** UC5: /cancel, leaving from the list, and declining an invitation. */
async function leaveChannel(channel: ServerChannel) {
  const isOwner = channel.ownerId === auth.user?.id;
  try {
    await channels.leave(channel.id);
    if (channel.state === "invited") channels.notice = "";
    // The server deletes a channel when its admin leaves
    else
      channels.notice = isOwner
        ? `#${channel.name} was closed.`
        : `You left #${channel.name}.`;
  } catch (error) {
    showError(error);
  }
}
/** UC4: /quit, the admin closes the channel for everyone. */
async function closeChannel(channel: ServerChannel) {
  try {
    await channels.close(channel.id);
    channels.notice = `#${channel.name} was closed.`;
  } catch (error) {
    showError(error);
  }
}
/** UC10: /list shows the members of the open channel with their status. */
async function listMembers(channel: ServerChannel) {
  const list = await messages.loadMembers(channel.id);
  channels.notice = `Members of #${channel.name}: ${list
    .map(member => `${member.nickName} (${STATUS_LABELS[member.status]})`)
    .join(", ")}`;
  membersOpen.value = true;
}

/**
 * UC3, UC4, UC5, UC10: runs a command typed into the command line.
 * The server checks who may do what; its answer is shown in the notice line.
 */
async function runCommand(text: string) {
  const command = parseCommand(text);
  if (command.name === "invalid") {
    channels.notice = command.message;
    return;
  }
  if (command.name === "help") {
    channels.notice = COMMAND_HELP.join("\n");
    return;
  }
  if (command.name === "join") {
    await joinChannel(command.channel, command.isPrivate);
    return;
  }

  // Every other command is about the open channel
  const channel = selected.value;
  if (!channel) {
    channels.notice = "Select a channel first.";
    return;
  }
  try {
    switch (command.name) {
      case "cancel":
        await leaveChannel(channel);
        break;
      case "quit":
        await closeChannel(channel);
        break;
      case "list":
        await listMembers(channel);
        break;
      case "invite":
        await channels.invite(channel.id, command.nickName);
        channels.notice = `${command.nickName} was invited to #${channel.name}.`;
        break;
      case "revoke":
        await channels.revoke(channel.id, command.nickName);
        channels.notice = `${command.nickName} was removed from #${channel.name}.`;
        break;
      case "kick": {
        const result = await channels.kick(channel.id, command.nickName);
        channels.notice = result.banned
          ? `${result.nickName} was banned from #${channel.name}.`
          : `Your kick of ${result.nickName} was counted: ${result.votes} of the ${result.votesNeeded} members needed for a ban.`;
        break;
      }
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 422)
      channels.notice =
        "That is not a valid nickname (letters, digits and _ only).";
    else showError(error);
  }
}

async function createChannel() {
  // The dialog accepts spaces; channel names are a single word
  const name = newChannel.value.trim().replace(/\s+/g, "-");
  if (!name || creatingChannel.value) return;
  creatingChannel.value = true;
  try {
    await channels.join(name, privateChannel.value);
  } catch (error) {
    channelError.value = channelErrorText(error);
    return;
  } finally {
    creatingChannel.value = false;
  }
  channels.notice = "";
  channelError.value = "";
  newChannel.value = "";
  privateChannel.value = false;
  channelDialog.value = false;
  mobileConversationVisible.value = true;
}

/** UC2: leaving or deleting a channel from the list asks first. */
function confirmLeave(channel: ServerChannel) {
  const isOwner = channel.ownerId === auth.user?.id;
  $q.dialog({
    title: isOwner ? "Delete channel" : "Leave channel",
    message: isOwner
      ? `Delete #${channel.name}? It will be closed for all its members.`
      : `Leave #${channel.name}?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    void (isOwner ? closeChannel(channel) : leaveChannel(channel));
  });
}
</script>
