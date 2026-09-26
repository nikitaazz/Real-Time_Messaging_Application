<template>
  <q-page class="settings-page q-pa-md">
    <div class="row justify-end q-mb-md">
      <q-btn
        class="theme-toggle"
        flat round
        :icon="isDark ? 'light_mode' : 'dark_mode'"
        aria-label="Toggle theme"
        @click="toggleTheme"
      />
    </div>
    <q-card class="settings-card q-pa-lg">
      <div class="row items-center justify-between q-mb-lg"
        ><div
          ><div class="text-h4">Settings</div
          ><div class="text-grey-7">Manage presence and notifications</div></div
        ><q-btn flat icon="arrow_back" label="Back to chat" to="/main"
      /></div>
      <q-separator />
      <div class="text-subtitle1 text-weight-medium q-mt-lg">Presence</div>
      <q-option-group
        v-model="presence"
        :options="presenceOptions"
        type="radio"
        inline
        class="q-mt-sm"
      />
      <div class="text-subtitle1 text-weight-medium q-mt-lg">Notifications</div>
      <q-toggle
        v-model="store.notifications"
        label="Message notifications when online"
      />
      <q-toggle v-model="store.mentionOnly" label="Only notify for mentions" />
      <q-banner class="q-mt-lg bg-grey-2"
        >Mock state is kept in Pinia for this prototype. Changes are immediately
        reflected in the chat.</q-banner
      >
      <q-btn
        color="negative"
        outline
        label="Log out"
        class="q-mt-xl"
        @click="logout"
      />
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useChatStore, type Presence } from "@/stores/example-store";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const store = useChatStore();
const { isDark, toggleTheme } = useTheme();
const presence = computed({
  get: () => store.user?.status ?? "Offline",
  set: (value: Presence) => store.setPresence(value)
});
const presenceOptions = ["Online", "DND", "Offline"].map(value => ({
  label: value,
  value
}));
function logout() {
  store.logout();
  void router.push("/login");
}
</script>
