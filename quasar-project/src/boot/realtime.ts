import { defineBoot } from "#q-app";
import { watch } from "vue";
import { getToken } from "@/services/api";
import { onNotificationClick } from "@/services/notifications";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { useAuthStore } from "@/stores/auth";
import { useChannelsStore } from "@/stores/channels";
import { useMessagesStore } from "@/stores/messages";
import { useTypingStore } from "@/stores/typing";

/**
 * Keeps the live connection (WebSocket) in step with the login state:
 * - a user logs in, or is restored after a page reload: connect with their token
 * - the user logs out: disconnect and forget everything that was loaded
 *
 * Every event the server pushes is handed to the store that owns that data.
 *
 * A boot file runs once when the app starts, with access to the stores and the router.
 * https://quasar.dev/quasar-cli-vite/boot-files
 */
export default defineBoot(({ store, router }) => {
  const auth = useAuthStore(store);
  const messages = useMessagesStore(store);
  const channels = useChannelsStore(store);
  const typing = useTypingStore(store);

  // UC8: clicking a notification opens the channel the message is in
  onNotificationClick(channelId => {
    channels.select(channelId);
    void router.push("/main");
  });

  watch(
    () => auth.user?.id,
    userId => {
      disconnectSocket();
      messages.$reset();
      typing.stop();

      const token = getToken();
      if (userId === undefined || !token) return;

      connectSocket(token, {
        // Sent after every (re)connect and when the user comes back from the
        // offline status (UC9): fetch what changed meanwhile. The channel list
        // first, so channels that were closed meanwhile are not asked for.
        ready: () =>
          void channels
            .load()
            .catch(() => {})
            .then(() => messages.resync()),
        "message:new": message => messages.receive(message),
        "channel:members": event => channels.onMembersChanged(event.channelId),
        "channel:deleted": event => channels.onDeleted(event.channelId),
        "channel:invited": channel => channels.onInvited(channel),
        "channel:removed": event => channels.onRemoved(event),
        "user:status": event => messages.setStatus(event.userId, event.status),
        "user:updated": user => auth.onUpdated(user),
        typing: event => typing.receive(event)
      });
    },
    // Run at the moment the user changes, before any page starts loading messages
    { flush: "sync" }
  );
});
