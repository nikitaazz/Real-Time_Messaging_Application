<template>
  <q-page class="settings-page q-pa-md">
    <div class="row justify-end q-mb-md">
      <q-btn
        class="theme-toggle"
        flat
        round
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
      <div class="notification-permission q-mt-md">
        Browser permission:
        <strong>{{ notificationPermission }}</strong>
      </div>
      <div class="row q-gutter-sm q-mt-sm">
        <q-btn
          color="primary"
          outline
          :label="
            notificationPermission === 'denied'
              ? 'Blocked by browser settings'
              : 'Enable browser notifications'
          "
          :disable="!canRequestPermission"
          @click="requestNotificationPermission"
        />
        <q-btn
          color="primary"
          outline
          label="Send test notification now"
          :disable="
            notificationPermission !== 'granted' || !store.notifications
          "
          @click="sendTestNotificationNow"
        />
        <q-btn
          color="primary"
          label="Add test message and open chat"
          :disable="store.user?.status !== 'Online' || !store.selectedChannel"
          @click="addTestMessageAndOpenChat"
        />
        <q-btn
          color="primary"
          label="Schedule demo incoming message (5s)"
          :disable="
            testQueued ||
            store.user?.status !== 'Online' ||
            !store.selectedChannel
          "
          @click="scheduleTestMessage"
        />
      </div>
      <div
        v-if="notificationPermission === 'denied'"
        class="notification-permission q-mt-sm"
      >
        Notifications are blocked for this site. Change BeBe's notification
        permission in your browser or device settings.
      </div>
      <q-banner v-if="notificationMessage" class="settings-info-banner q-mt-md">
        {{ notificationMessage }}
      </q-banner>
      <div
        v-if="store.lastNotificationStatus"
        class="notification-permission q-mt-sm"
      >
        Latest incoming-message result:
        {{ store.lastNotificationStatus }}
      </div>
      <q-banner class="settings-info-banner q-mt-lg"
        >Notifications are delivered only while BeBe is hidden. Allow browser
        notifications, keep your status Online, and switch tabs after scheduling
        the demo message. This prototype has no live messaging server, so the
        demo message is used to verify notification delivery.</q-banner
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useChatStore, type Presence } from "@/stores/example-store";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const store = useChatStore();
const { isDark, toggleTheme } = useTheme();
const testQueued = ref(false);
const notificationMessage = ref("");
const notificationPermission = ref<NotificationPermission | "unsupported">(
  "unsupported"
);
let demoTimeout: number | undefined;
const canRequestPermission = computed(
  () => notificationPermission.value === "default"
);
const presence = computed({
  get: () => store.user?.status ?? "Offline",
  set: (value: Presence) => store.setPresence(value)
});
const presenceOptions = ["Online", "DND", "Offline"].map(value => ({
  label: value,
  value
}));
function refreshNotificationPermission() {
  notificationPermission.value =
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported";
}
async function requestNotificationPermission() {
  if (notificationPermission.value === "unsupported") {
    notificationMessage.value =
      "This browser does not support desktop notifications.";
    return;
  }
  try {
    notificationPermission.value =
      await window.Notification.requestPermission();
    notificationMessage.value =
      notificationPermission.value === "granted"
        ? "Browser notifications are enabled."
        : notificationPermission.value === "denied"
          ? "Notifications are blocked. Allow them in your browser or device settings."
          : "Browser notifications were not enabled.";
  } catch (error) {
    notificationMessage.value =
      "The browser could not request notification permission. Check the site and device settings.";
    console.error("BeBe could not request notification permission.", error);
  }
}
async function sendTestNotificationNow() {
  if (notificationPermission.value !== "granted") {
    notificationMessage.value =
      "Allow browser notifications before sending a test.";
    return;
  }
  if (!store.notifications) {
    notificationMessage.value =
      "Turn on message notifications in BeBe settings first.";
    return;
  }
  try {
    const title = "BeBe notification test";
    const options = {
      body: "Your browser/device can display BeBe notifications.",
      tag: `bebe-test-${Date.now()}`
    };
    const registration =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined;
    if (registration?.active) {
      await registration.showNotification(title, options);
    } else {
      new window.Notification(title, options);
    }
    notificationMessage.value =
      "Test notification sent. If it is not visible, check your operating system's notification settings or Do Not Disturb mode.";
  } catch (error) {
    notificationMessage.value =
      "The browser could not display a notification. Check site permission, HTTPS/localhost, and device notification settings.";
    console.error("BeBe test notification failed.", error);
  }
}
function scheduleTestMessage() {
  const channel = store.selectedChannel;
  if (!channel || !store.user) return;
  testQueued.value = true;
  notificationMessage.value =
    "Demo incoming message scheduled. It will be added to the channel in 5 seconds. To test a Windows notification, switch tabs before then.";
  demoTimeout = window.setTimeout(() => {
    store.receiveMessage(
      channel.id,
      "nikita",
      store.mentionOnly
        ? `@${store.user?.nickName} This is a BeBe notification test.`
        : "This is a BeBe notification test."
    );
    testQueued.value = false;
    notificationMessage.value = `Demo message added to #${channel.name}. ${store.lastNotificationStatus}`;
  }, 5000);
}
function addTestMessageAndOpenChat() {
  const channel = store.selectedChannel;
  if (!channel || !store.user || store.user.status !== "Online") return;
  store.receiveMessage(
    channel.id,
    "nikita",
    store.mentionOnly
      ? `@${store.user.nickName} This is a BeBe notification test.`
      : "This is a BeBe notification test."
  );
  notificationMessage.value = `Demo message added to #${channel.name}. ${store.lastNotificationStatus}`;
  void router.push("/main");
}
function logout() {
  store.logout();
  void router.push("/login");
}
onBeforeUnmount(() => {
  if (demoTimeout !== undefined) window.clearTimeout(demoTimeout);
  window.removeEventListener("focus", refreshNotificationPermission);
});
onMounted(() => {
  refreshNotificationPermission();
  window.addEventListener("focus", refreshNotificationPermission);
});
</script>
