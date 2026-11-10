import { defineBoot } from "#q-app";
import { watch } from "vue";
import { getToken } from "@/services/api";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { useAuthStore } from "@/stores/auth";
import { useChannelsStore } from "@/stores/channels";
import { useMessagesStore } from "@/stores/messages";

/**
 * Keeps the live connection (WebSocket) in step with the login state:
 * - a user logs in, or is restored after a page reload: connect with their token
 * - the user logs out: disconnect and forget the messages that were loaded
 *
 * A boot file runs once when the app starts, with access to the stores.
 * https://quasar.dev/quasar-cli-vite/boot-files
 */
export default defineBoot(({ store }) => {
  const auth = useAuthStore(store);
  const messages = useMessagesStore(store);
  const channels = useChannelsStore(store);

  watch(
    () => auth.user?.id,
    userId => {
      disconnectSocket();
      messages.$reset();

      const token = getToken();
      if (userId === undefined || !token) return;

      connectSocket(token, {
        // Sent after every (re)connect: fetch what changed while we were not connected.
        // The channel list first, so channels that were closed meanwhile are not asked for.
        ready: () =>
          void channels
            .load()
            .catch(() => {})
            .then(() => messages.resync()),
        "message:new": message => messages.receive(message),
        "channel:members": event => channels.onMembersChanged(event.channelId),
        "channel:deleted": event => channels.onDeleted(event.channelId)
      });
    },
    // Run at the moment the user changes, before any page starts loading messages
    { flush: "sync" }
  );
});
