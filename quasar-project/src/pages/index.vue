<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <router-view />
    </q-page-container>
    <Teleport to="body">
      <q-banner
        v-if="store.inAppNotification"
        class="in-app-notification"
        role="status"
      >
        <div class="text-weight-bold">{{ store.inAppNotification.title }}</div>
        <div>{{ store.inAppNotification.body }}</div>
        <template #action>
          <q-btn flat dense label="Open" @click="openNotificationChannel" />
          <q-btn
            flat
            dense
            round
            icon="close"
            aria-label="Dismiss notification"
            @click="dismissNotification"
          />
        </template>
      </q-banner>
    </Teleport>
  </q-layout>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useChatStore } from "@/stores/example-store";

const router = useRouter();
const store = useChatStore();

function openNotificationChannel() {
  const channelId = store.inAppNotification?.channelId;
  if (!channelId) return;
  store.selectChannel(channelId);
  void router.push("/main");
  dismissNotification();
}

function dismissNotification() {
  store.dismissInAppNotification();
}
onBeforeUnmount(dismissNotification);
</script>
