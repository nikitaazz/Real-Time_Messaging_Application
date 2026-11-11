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
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <div class="text-h4">Settings</div>
          <div class="text-grey-7">Your account, status and notifications</div>
        </div>
        <q-btn flat icon="arrow_back" label="Back to chat" to="/main" />
      </div>
      <q-separator />

      <!-- UC1: the account -->
      <div class="text-subtitle1 text-weight-medium q-mt-lg">Account</div>
      <div v-if="auth.user" class="account-details q-mt-sm">
        <div>
          <span class="text-grey-7">Name</span>
          {{ auth.user.firstName }} {{ auth.user.lastName }}
        </div>
        <div>
          <span class="text-grey-7">Nickname</span>
          @{{ auth.user.nickName }}
        </div>
        <div>
          <span class="text-grey-7">Email</span>
          {{ auth.user.email }}
        </div>
      </div>

      <!-- UC9: the status the other members see -->
      <div class="text-subtitle1 text-weight-medium q-mt-lg">Status</div>
      <q-option-group
        v-model="status"
        :options="statusOptions"
        type="radio"
        inline
        class="q-mt-sm"
        :disable="saving"
      />
      <div class="notification-permission">{{ statusHint }}</div>

      <!-- UC8: notifications -->
      <div class="text-subtitle1 text-weight-medium q-mt-lg">Notifications</div>
      <div class="notification-permission q-mt-sm">
        BeBe notifies you about new messages while its window or tab is not
        visible. Browser permission:
        <strong>{{ access }}</strong>
      </div>
      <q-toggle
        v-model="mentionOnly"
        label="Only notify me about messages that mention me (@nickname)"
        :disable="saving"
      />
      <div class="row q-gutter-sm q-mt-sm">
        <q-btn
          color="primary"
          outline
          :label="
            access === 'denied'
              ? 'Blocked by browser settings'
              : access === 'granted'
                ? 'Browser notifications are allowed'
                : 'Allow browser notifications'
          "
          :disable="access !== 'default'"
          @click="requestAccess"
        />
        <q-btn
          color="primary"
          outline
          label="Show a test notification"
          :disable="access !== 'granted'"
          @click="showTestNotification"
        />
      </div>
      <div v-if="access === 'denied'" class="notification-permission q-mt-sm">
        Notifications are blocked for this site. Change BeBe's notification
        permission in your browser or device settings.
      </div>
      <q-banner
        v-if="message"
        class="settings-info-banner q-mt-md"
        role="status"
      >
        {{ message }}
      </q-banner>
      <div
        v-if="messages.lastNotificationResult"
        class="notification-permission q-mt-sm"
      >
        The latest message raised no notification:
        {{ messages.lastNotificationResult }}
      </div>

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
import { STATUS_LABELS, useAuthStore, type Status } from "@/stores/auth";
import { useMessagesStore } from "@/stores/messages";
import { ApiError } from "@/services/api";
import { notificationAccess, showNotification } from "@/services/notifications";
import type { NotificationAccess } from "@/utils/notifications";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const auth = useAuthStore();
const messages = useMessagesStore();
const { isDark, toggleTheme } = useTheme();

/** Feedback for the last thing done on this page. */
const message = ref("");
const saving = ref(false);
const access = ref<NotificationAccess>("unsupported");

const statusOptions = (["online", "dnd", "offline"] as const).map(value => ({
  label: STATUS_LABELS[value],
  value
}));
const statusHints: Record<Status, string> = {
  online: "You receive messages and notifications.",
  dnd: "Do not disturb: you receive messages, but no notifications.",
  offline:
    "You receive no messages. When you go online again, your channels are brought up to date."
};
const statusHint = computed(() => statusHints[auth.user?.status ?? "offline"]);

/** UC8, UC9: saves a setting on the server; the stored value is what the page shows. */
async function save(changes: { status?: Status; mentionOnly?: boolean }) {
  saving.value = true;
  message.value = "";
  try {
    await auth.updateSettings(changes);
  } catch (error) {
    message.value =
      error instanceof ApiError
        ? error.message
        : "The setting could not be saved.";
  } finally {
    saving.value = false;
  }
}
const status = computed({
  get: () => auth.user?.status ?? "offline",
  set: (value: Status) => void save({ status: value })
});
const mentionOnly = computed({
  get: () => auth.user?.mentionOnly ?? false,
  set: (value: boolean) => void save({ mentionOnly: value })
});

function refreshAccess() {
  access.value = notificationAccess();
}
/** The browser asks the user whether BeBe may show notifications. */
async function requestAccess() {
  if (access.value === "unsupported") {
    message.value = "This browser does not support notifications.";
    return;
  }
  try {
    access.value = await Notification.requestPermission();
    message.value =
      access.value === "granted"
        ? "Browser notifications are allowed."
        : access.value === "denied"
          ? "Notifications are blocked. Allow them in your browser or device settings."
          : "Browser notifications were not allowed.";
  } catch (error) {
    message.value =
      "The browser could not ask for permission. Check the site and device settings.";
    console.error("BeBe could not request notification permission.", error);
  }
}
/**
 * Shows a notification right away, to check that the browser and the system
 * let them through. Real ones appear only while BeBe is not visible.
 */
function showTestNotification() {
  const shown = showNotification(
    "BeBe",
    "Notifications work. You will see one for new messages while BeBe is not visible.",
    "bebe-test"
  );
  message.value = shown
    ? "A test notification was sent. If you don't see it, check the notification settings of your system."
    : "The browser does not allow notifications for BeBe.";
}
async function logout() {
  await auth.logout();
  void router.push("/login");
}

// The permission can be changed in the browser's own settings while this page is open
onMounted(() => {
  refreshAccess();
  window.addEventListener("focus", refreshAccess);
});
onBeforeUnmount(() => {
  window.removeEventListener("focus", refreshAccess);
});
</script>
