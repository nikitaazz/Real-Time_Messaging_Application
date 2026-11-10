<template>
  <q-page class="chat-page">
    <div
      class="chat-shell"
      :class="{
        'members-open': membersOpen,
        'mobile-conversation-open': isMobile && mobileConversationVisible
      }"
    >
      <aside class="channel-panel">
        <div class="row items-center justify-between q-mb-md">
          <div
            ><div class="text-h6 text-weight-bold">BeBe</div
            ><div class="text-caption text-grey-6">Your conversations</div></div
          >
          <q-btn
            round
            flat
            icon="add"
            aria-label="Create channel"
            @click="channelDialog = true"
            ><q-tooltip>Create channel</q-tooltip></q-btn
          >
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
            :active="channel.id === store.selectedChannelId"
            active-class="channel-active"
            :class="{ 'channel-invited': isInvited(channel) }"
            @click="openChannel(channel)"
          >
            <q-item-section avatar
              ><q-icon :name="channel.private ? 'lock' : 'tag'" size="18px"
            /></q-item-section>
            <q-item-section
              ><q-item-label>{{ channel.name }}</q-item-label
              ><q-item-label caption>{{
                isInvited(channel)
                  ? "Invitation - select to join"
                  : channel.description
              }}</q-item-label></q-item-section
            >
            <q-item-section side
              ><q-btn
                flat
                round
                dense
                :icon="isInvited(channel) ? 'close' : 'more_vert'"
                :aria-label="
                  isInvited(channel) ? 'Decline invitation' : 'Channel actions'
                "
                @click.stop="
                  isInvited(channel)
                    ? leaveChannel(channel.id)
                    : channelMenu(channel.id)
                "
                ><q-tooltip>{{
                  isInvited(channel) ? "Decline invitation" : "Leave channel"
                }}</q-tooltip></q-btn
              ></q-item-section
            >
            <q-item-section
              v-if="store.unreadCounts[channel.id]"
              side
              class="channel-unread"
            >
              <q-badge
                color="primary"
                :label="store.unreadCounts[channel.id]"
                rounded
              />
            </q-item-section>
          </q-item>
        </q-list>
        <q-space />
        <q-separator class="q-my-md" />
        <div class="row items-center no-wrap">
          <q-avatar color="primary" text-color="white" size="36px">{{
            initials
          }}</q-avatar>
          <div class="q-ml-sm ellipsis"
            ><div class="text-weight-medium">{{
              store.user?.name ?? "Guest"
            }}</div
            ><div class="text-caption text-grey-6">{{
              store.user?.status ?? "Offline"
            }}</div></div
          >
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
          <div
            ><div class="text-h6">{{
              selectedChannel
                ? `# ${selectedChannel.name}`
                : "No channel selected"
            }}</div
            ><div class="text-caption text-grey-6">{{
              selectedChannel?.description
            }}</div></div
          >
          <div class="row items-center q-gutter-xs">
            <q-btn
              flat
              round
              icon="group"
              :disable="!selectedChannel"
              @click="membersOpen = !membersOpen"
              ><q-tooltip>Members</q-tooltip></q-btn
            >
            <q-btn
              flat
              round
              icon="logout"
              :disable="!selectedChannel"
              @click="leave"
              ><q-tooltip>{{
                selectedChannel?.ownerId === store.user?.id
                  ? "Delete channel"
                  : "Leave channel"
              }}</q-tooltip></q-btn
            >
          </div>
        </header>
        <q-banner v-if="store.commandHint" dense class="command-banner"
          >Command: {{ store.commandHint }}
          <template #action
            ><q-btn
              flat
              label="Clear"
              @click="store.commandHint = ''" /></template
        ></q-banner>
        <div ref="messageScroll" class="message-scroll" @scroll="onScroll">
          <div v-if="loading" class="text-center text-caption text-grey q-pa-sm"
            >Loading older messages...</div
          >
          <q-btn
            v-else-if="canLoadMore"
            flat
            color="primary"
            label="Load earlier messages"
            class="full-width q-mb-md"
            :disable="!selectedChannel"
            @click="loadHistory"
          />
          <div
            v-else-if="selectedChannel"
            class="text-center text-caption text-grey-6 q-pa-sm"
            >This is the beginning of #{{ selectedChannel.name }}</div
          >
          <div v-if="!selectedChannel" class="text-center text-grey-7 q-pa-lg">
            Join or create a channel to start chatting.
          </div>
          <div
            v-for="message in visibleMessages"
            :key="message.id"
            class="message-row"
            :class="{ 'message-addressed': message.addressedToMe }"
          >
            <q-avatar size="34px" color="secondary" text-color="white">{{
              message.author.slice(0, 1)
            }}</q-avatar>
            <div class="message-content">
              <div
                ><strong>{{ message.author }}</strong
                ><span class="text-caption text-grey-6 q-ml-sm">{{
                  message.time
                }}</span></div
              >
              <div class="message-bubble">
                <template v-for="(part, index) in message.parts" :key="index">
                  <mark v-if="part.mention">{{ part.text }}</mark>
                  <template v-else>{{ part.text }}</template>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div v-if="store.typing" class="typing text-caption text-grey-7"
          >You are typing...</div
        >
        <div class="draft-preview" v-if="store.draft"
          >Your draft: {{ store.draft }}</div
        >
        <footer class="composer">
          <q-input
            v-model="composer"
            outlined
            dense
            :placeholder="
              composer.startsWith('/')
                ? '/join #channel or /list'
                : selectedChannel
                  ? 'Write a message...'
                  : 'Use /join channelName to get started'
            "
            @keydown.enter.exact.prevent="send"
            @update:model-value="onDraft"
          >
            <template #prepend><q-icon name="chat_bubble_outline" /></template>
            <template #append
              ><q-btn
                flat
                round
                icon="send"
                color="primary"
                :disable="
                  !composer.trim() ||
                  (!selectedChannel && !composer.trim().startsWith('/'))
                "
                @click="send"
            /></template>
          </q-input>
          <div class="text-caption text-grey-6 q-mt-xs"
            >Commands: /join /invite /revoke /kick /quit /cancel /list</div
          >
        </footer>
      </section>

      <aside v-if="membersOpen" class="member-panel">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold"
            >Members
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
          <q-item-section avatar
            ><q-avatar size="32px" color="secondary" text-color="white">{{
              member.name.slice(0, 1)
            }}</q-avatar></q-item-section
          >
          <q-item-section
            >{{ member.name
            }}<q-item-label caption class="member-status"
              ><span
                :class="`status-dot status-${member.status.toLowerCase()}`"
              />
              {{ member.status }}</q-item-label
            ></q-item-section
          >
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
          @update:model-value="channelError = ''"
          autofocus
        />
        <q-toggle v-model="privateChannel" label="Private channel" />
        <div class="row justify-end q-gutter-sm q-mt-md"
          ><q-btn flat label="Cancel" v-close-popup /><q-btn
            color="primary"
            label="Create"
            :loading="creatingChannel"
            :disable="!newChannel.trim()"
            @click="createChannel"
        /></div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useQuasar } from "quasar";
import {
  useChatStore,
  type Channel,
  type Member,
  type Presence
} from "@/stores/example-store";
import {
  isServerChannel,
  useMessagesStore,
  type ChannelMember
} from "@/stores/messages";
import { useChannelsStore } from "@/stores/channels";
import { ApiError } from "@/services/api";
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

const store = useChatStore();
const messages = useMessagesStore();
const channels = useChannelsStore();
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
const loading = ref(false);
const messageScroll = ref<HTMLElement | null>(null);
const filteredChannels = computed(() =>
  store.channels
    .filter(
      channel =>
        (channel.members.some(person => person.id === store.user?.id) ||
          isInvited(channel)) &&
        channel.name.includes((search.value ?? "").toLowerCase())
    )
    .sort(
      (first, second) => Number(isInvited(second)) - Number(isInvited(first))
    )
);
const selectedChannel = computed(() => store.selectedChannel);
/** Id of the selected channel when it comes from the backend, otherwise null (mock channel). */
const serverChannelId = computed(() =>
  isServerChannel(selectedChannel.value?.id)
    ? (selectedChannel.value?.id ?? null)
    : null
);
const visibleMessages = computed<MessageView[]>(() =>
  serverChannelId.value
    ? messages
        .messagesFor(serverChannelId.value)
        .map(message => toMessageView(message, formatTime(message.createdAt)))
    : (selectedChannel.value?.messages ?? []).map(message =>
        toMessageView(message, message.time)
      )
);
const canLoadMore = computed(() =>
  serverChannelId.value ? messages.hasMoreFor(serverChannelId.value) : true
);
const members = computed<Member[]>(() =>
  serverChannelId.value
    ? messages.membersFor(serverChannelId.value).map(toMember)
    : store.onlineMembers
);
const initials = computed(() =>
  (store.user?.name ?? "G").slice(0, 1).toUpperCase()
);

function isInvited(channel: Channel) {
  return (
    channel.invitedUserIds.includes(store.user?.id ?? "") &&
    !channel.members.some(person => person.id === store.user?.id)
  );
}
async function openChannel(channel: Channel) {
  // Selecting an invitation accepts it (UC2)
  if (isInvited(channel)) await joinChannel(channel.name);
  else store.selectChannel(channel.id);
  if (store.selectedChannelId === channel.id)
    mobileConversationVisible.value = true;
}
const presenceLabel: Record<ChannelMember["status"], Presence> = {
  online: "Online",
  dnd: "DND",
  offline: "Offline"
};
function toMember(member: ChannelMember): Member {
  return {
    id: String(member.id),
    name: member.nickName,
    firstName: member.firstName,
    lastName: member.lastName,
    nickName: member.nickName,
    status: presenceLabel[member.status]
  };
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
function toMessageView(
  message: { id: number; author: string; body: string; mentions?: string[] },
  time: string
): MessageView {
  const mentions = message.mentions ?? [];
  const myNickName = store.user?.nickName.toLowerCase();
  return {
    id: message.id,
    author: message.author,
    time,
    parts: splitMentions(message.body, mentions),
    addressedToMe: mentions.some(name => name.toLowerCase() === myNickName)
  };
}
function showError(error: unknown) {
  store.commandHint =
    error instanceof ApiError ? error.message : "Something went wrong.";
}
function scrollToBottom() {
  const scrollElement = messageScroll.value;
  if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
}

// Opening a backend channel loads its newest messages (UC7) and members (UC10)
watch(
  serverChannelId,
  async channelId => {
    if (!channelId) return;
    try {
      await messages.open(channelId);
    } catch (error) {
      showError(error);
    }
  },
  { immediate: true }
);

// Switching to another channel shows its newest messages
watch(() => selectedChannel.value?.id, scrollToBottom, { flush: "post" });

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

/** UC10: /list shows the members of the current channel with their status. */
async function listMembers(channelId: string) {
  try {
    const list = await messages.loadMembers(channelId);
    store.commandHint = `Members of #${selectedChannel.value?.name}: ${list
      .map(member => `${member.nickName} (${presenceLabel[member.status]})`)
      .join(", ")}`;
    membersOpen.value = true;
  } catch (error) {
    showError(error);
  }
}
async function send() {
  const text = composer.value.trim();
  if (!text) return;
  composer.value = "";
  store.setTyping("");
  if (text.startsWith("/")) {
    await runCommand(text);
    return;
  }
  if (!serverChannelId.value) {
    store.sendMessage(text);
    return;
  }
  // UC3: send to the backend; on failure keep the text so it isn't lost
  try {
    await messages.send(serverChannelId.value, text);
    await nextTick();
    scrollToBottom();
  } catch (error) {
    // Put the text back, unless the user has already started typing something else
    if (!composer.value) composer.value = text;
    showError(error);
  }
}
function onDraft(value: string | number | null) {
  store.setTyping(String(value ?? ""));
}
/** UC7: loads older messages and keeps the messages on screen in place. */
async function loadHistory() {
  const scrollElement = messageScroll.value;
  if (
    !scrollElement ||
    loading.value ||
    !selectedChannel.value ||
    !canLoadMore.value
  )
    return;
  const previousHeight = scrollElement.scrollHeight;
  const previousTop = scrollElement.scrollTop;
  loading.value = true;
  try {
    if (serverChannelId.value) await messages.loadOlder(serverChannelId.value);
    else {
      // Mock channels: simulate network delay
      await new Promise(resolve => window.setTimeout(resolve, 350));
      store.loadHistory();
    }
    await nextTick();
    if (messageScroll.value)
      messageScroll.value.scrollTop =
        previousTop + messageScroll.value.scrollHeight - previousHeight;
  } catch (error) {
    showError(error);
  } finally {
    loading.value = false;
  }
}
function onScroll(event: Event) {
  if ((event.target as HTMLElement).scrollTop < 20 && !loading.value)
    loadHistory();
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
    store.commandHint = "";
    mobileConversationVisible.value = true;
    return channel;
  } catch (error) {
    store.commandHint = channelErrorText(error);
    return null;
  }
}
/** UC5: /cancel, leaving from the list, and declining an invitation. */
async function leaveChannel(id: string) {
  const channel = store.channels.find(item => item.id === id);
  if (!channel) return;
  const isOwner = channel.ownerId === store.user?.id;
  try {
    await channels.leave(id);
    // The server deletes a channel when its admin leaves
    store.commandHint = isInvited(channel)
      ? ""
      : isOwner
        ? `#${channel.name} was closed.`
        : `You left #${channel.name}.`;
  } catch (error) {
    showError(error);
  }
}
/** UC4: /quit, the admin closes the channel for everyone. */
async function closeChannel(id: string) {
  const channel = store.channels.find(item => item.id === id);
  if (!channel) return;
  try {
    await channels.close(id);
    store.commandHint = `#${channel.name} was closed.`;
  } catch (error) {
    showError(error);
  }
}
/**
 * UC3: commands typed into the command line.
 * /join, /cancel, /quit and /list are handled by the backend.
 */
async function runCommand(text: string) {
  const [command, ...args] = text.split(/\s+/);
  const current = serverChannelId.value;
  const needsChannel = "Select a channel first.";

  switch (command) {
    case "/join": {
      const [name, visibility] = args;
      if (
        !name ||
        args.length > 2 ||
        (visibility && visibility !== "private")
      ) {
        store.commandHint = "Use /join channelName [private].";
        return;
      }
      await joinChannel(name, visibility === "private");
      return;
    }
    case "/cancel":
      if (current) await leaveChannel(current);
      else store.commandHint = needsChannel;
      return;
    case "/quit":
      if (current) await closeChannel(current);
      else store.commandHint = needsChannel;
      return;
    case "/list":
      if (current) await listMembers(current);
      else store.commandHint = needsChannel;
      return;
    case "/invite":
    case "/revoke":
    case "/kick":
      store.commandHint = `${command} is not connected to the server yet.`;
      return;
    default:
      store.commandHint = `Unknown command ${command}.`;
  }
}
async function createChannel() {
  // The dialog accepts spaces; channel names are a single word
  const name = newChannel.value.trim().replace(/\s+/g, "-");
  creatingChannel.value = true;
  try {
    await channels.join(name, privateChannel.value);
  } catch (error) {
    channelError.value = channelErrorText(error);
    return;
  } finally {
    creatingChannel.value = false;
  }
  store.commandHint = "";
  channelError.value = "";
  newChannel.value = "";
  privateChannel.value = false;
  channelDialog.value = false;
  mobileConversationVisible.value = true;
}
function channelMenu(id: string) {
  const channel = store.channels.find(item => item.id === id);
  if (!channel) return;
  const isOwner = channel.ownerId === store.user?.id;
  $q.dialog({
    title: "Channel actions",
    message: isOwner ? `Delete #${channel.name}?` : `Leave #${channel.name}?`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    void (isOwner ? closeChannel(id) : leaveChannel(id));
  });
}
function leave() {
  if (selectedChannel.value) channelMenu(selectedChannel.value.id);
}
</script>
