<template>
  <q-page class="chat-page">
    <div class="chat-shell" :class="{ 'members-open': membersOpen }">
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
          />
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
                isInvited(channel) ? 'Invitation - select to join' : channel.description
              }}</q-item-label></q-item-section
            >
            <q-item-section side
              ><q-btn
                flat
                round
                dense
                :icon="isInvited(channel) ? 'close' : 'more_vert'"
                :aria-label="isInvited(channel) ? 'Decline invitation' : 'Channel actions'"
                @click.stop="
                  isInvited(channel)
                    ? store.declineInvitation(channel.id)
                    : channelMenu(channel.id)
                "
            /></q-item-section>
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
          <div
            ><div class="text-h6">{{
              selectedChannel ? `# ${selectedChannel.name}` : "No channel selected"
            }}</div
            ><div class="text-caption text-grey-6">{{
              selectedChannel?.description
            }}</div></div
          >
          <div class="row items-center q-gutter-xs">
            <q-btn flat round icon="group" :disable="!selectedChannel" @click="membersOpen = !membersOpen"
              ><q-tooltip>Members</q-tooltip></q-btn
            >
            <q-btn flat round icon="logout" :disable="!selectedChannel" @click="leave"
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
        <div class="message-scroll" @scroll="onScroll">
          <div v-if="loading" class="text-center text-caption text-grey q-pa-sm"
            >Loading older messages...</div
          >
          <q-btn
            v-else
            flat
            color="primary"
            label="Load earlier messages"
            class="full-width q-mb-md"
            :disable="!selectedChannel"
            @click="loadHistory"
          />
          <div v-if="!selectedChannel" class="text-center text-grey-7 q-pa-lg">
            Join or create a channel to start chatting.
          </div>
          <div
            v-for="message in selectedChannel?.messages ?? []"
            :key="message.id"
            class="message-row"
            :class="{ 'message-addressed': isAddressedToMe(message) }"
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
              <div
                class="message-bubble"
                v-html="highlightMentions(message.body)"
              ></div>
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
                : selectedChannel ? 'Write a message...' : 'Use /join channelName to get started'
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
                :disable="!composer.trim() || (!selectedChannel && !composer.trim().startsWith('/'))"
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
          <div class="text-subtitle1 text-weight-bold">Members
            <span class="text-caption text-grey-6">({{ members.length }})</span>
          </div>
          <q-btn
            flat round dense icon="close" class="member-close"
            aria-label="Close members" @click="membersOpen = false"
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
            }}<q-item-label caption
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
            :disable="!newChannel.trim()"
            @click="createChannel"
        /></div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import { useChatStore, type Channel, type ChatMessage } from "@/stores/example-store";
import { useTheme } from "@/composables/useTheme";

const store = useChatStore();
const { isDark, toggleTheme } = useTheme();
const $q = useQuasar();
const search = ref("");
const composer = ref("");
const channelDialog = ref(false);
const newChannel = ref("");
const channelError = ref("");
const privateChannel = ref(false);
const membersOpen = ref($q.screen.width > 900);
const loading = ref(false);
const filteredChannels = computed(() =>
  store.channels
    .filter(channel =>
      (channel.members.some(person => person.id === store.user?.id) || isInvited(channel)) &&
      channel.name.includes((search.value ?? "").toLowerCase())
    )
    .sort((first, second) => Number(isInvited(second)) - Number(isInvited(first)))
);
const selectedChannel = computed(() => store.selectedChannel);
const members = computed(() => store.onlineMembers);
const initials = computed(() =>
  (store.user?.name ?? "G").slice(0, 1).toUpperCase()
);

function isInvited(channel: Channel) {
  return channel.invitedUserIds.includes(store.user?.id ?? "") &&
    !channel.members.some(person => person.id === store.user?.id);
}
function openChannel(channel: Channel) {
  if (isInvited(channel)) store.runCommand(`/join ${channel.name}`);
  else store.selectChannel(channel.id);
}
function send() {
  if (composer.value.trim().startsWith("/")) {
    store.runCommand(composer.value);
    if (composer.value.trim() === "/list" && selectedChannel.value)
      membersOpen.value = true;
  } else store.sendMessage(composer.value);
  composer.value = "";
  store.setTyping("");
}
function onDraft(value: string | number | null) {
  store.setTyping(String(value ?? ""));
}
function loadHistory() {
  loading.value = true;
  window.setTimeout(() => {
    store.loadHistory();
    loading.value = false;
  }, 350);
}
function onScroll(event: Event) {
  if ((event.target as HTMLElement).scrollTop < 20 && !loading.value)
    loadHistory();
}
function highlightMentions(body: string) {
  return body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/@([a-z0-9_-]+)/gi, "<mark>@$1</mark>");
}
function isAddressedToMe(message: ChatMessage) {
  return message.mentions?.some(
    name => name.toLowerCase() === store.user?.nickName.toLowerCase()
  ) ?? false;
}
function createChannel() {
  if (!store.createChannel(newChannel.value, privateChannel.value)) {
    channelError.value = store.commandHint;
    return;
  }
  store.commandHint = "";
  channelError.value = "";
  newChannel.value = "";
  privateChannel.value = false;
  channelDialog.value = false;
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
    if (isOwner) store.deleteChannel(id);
    else store.leaveChannel(id);
  });
}
function leave() {
  if (selectedChannel.value) channelMenu(selectedChannel.value.id);
}
</script>
