<template>
  <q-page class="chat-page">
    <div class="chat-shell">
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
            @click="store.selectChannel(channel.id)"
          >
            <q-item-section avatar
              ><q-icon :name="channel.private ? 'lock' : 'tag'" size="18px"
            /></q-item-section>
            <q-item-section
              ><q-item-label>{{ channel.name }}</q-item-label
              ><q-item-label caption>{{
                channel.description
              }}</q-item-label></q-item-section
            >
            <q-item-section side
              ><q-btn
                flat
                round
                dense
                icon="more_vert"
                @click.stop="channelMenu(channel.id)"
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
            ><div class="text-h6"># {{ selectedChannel?.name }}</div
            ><div class="text-caption text-grey-6">{{
              selectedChannel?.description
            }}</div></div
          >
          <div class="row items-center q-gutter-xs">
            <q-btn flat round icon="group" @click="membersOpen = !membersOpen"
              ><q-tooltip>Members</q-tooltip></q-btn
            >
            <q-btn flat round icon="logout" @click="leave"
              ><q-tooltip>Leave channel</q-tooltip></q-btn
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
            @click="loadHistory"
          />
          <div
            v-for="message in selectedChannel?.messages ?? []"
            :key="message.id"
            class="message-row"
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
          >{{ store.typingState?.nickName }} is typing...</div
        >
        <div class="draft-preview" v-if="store.draft"
          >Draft: {{ store.draft }}</div
        >
        <footer class="composer">
          <q-input
            v-model="composer"
            outlined
            dense
            :placeholder="
              composer.startsWith('/')
                ? '/join #channel or /list'
                : 'Write a message...'
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
                :disable="!composer.trim()"
                @click="send"
            /></template>
          </q-input>
          <div class="text-caption text-grey-6 q-mt-xs"
            >Commands: /join /invite /revoke /kick /quit /cancel /list</div
          >
        </footer>
      </section>

      <aside v-if="membersOpen" class="member-panel">
        <div class="text-subtitle1 text-weight-bold q-mb-md"
          >Members
          <span class="text-caption text-grey-6"
            >({{ members.length }})</span
          ></div
        >
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
          autofocus
        />
        <q-toggle v-model="privateChannel" label="Private channel" />
        <div class="row justify-end q-gutter-sm q-mt-md"
          ><q-btn flat label="Cancel" v-close-popup /><q-btn
            color="primary"
            label="Create"
            @click="createChannel"
        /></div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuasar } from "quasar";
import { useChatStore } from "@/stores/example-store";
import { useTheme } from "@/composables/useTheme";

const store = useChatStore();
const { isDark, toggleTheme } = useTheme();
const $q = useQuasar();
const search = ref("");
const composer = ref("");
const channelDialog = ref(false);
const newChannel = ref("");
const privateChannel = ref(false);
const membersOpen = ref(true);
const loading = ref(false);
const filteredChannels = computed(() =>
  store.channels.filter(channel =>
    channel.name.includes(search.value.toLowerCase())
  )
);
const selectedChannel = computed(
  () => store.selectedChannel ?? store.channels[0]
);
const members = computed(() => store.onlineMembers);
const initials = computed(() =>
  (store.user?.name ?? "G").slice(0, 1).toUpperCase()
);

function send() {
  if (composer.value.trim().startsWith("/")) store.runCommand(composer.value);
  else store.sendMessage(composer.value);
  composer.value = "";
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
function createChannel() {
  store.createChannel(newChannel.value, privateChannel.value);
  newChannel.value = "";
  privateChannel.value = false;
  channelDialog.value = false;
}
function channelMenu(id: string) {
  $q.dialog({
    title: "Channel actions",
    message: "Delete this channel?",
    cancel: true,
    persistent: true
  }).onOk(() => store.deleteChannel(id));
}
function leave() {
  store.leaveChannel();
}
</script>
