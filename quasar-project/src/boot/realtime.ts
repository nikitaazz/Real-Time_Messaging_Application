import { defineBoot } from "#q-app";
import { watch } from "vue";
import { getToken } from "@/services/api";
import { connectSocket, disconnectSocket } from "@/services/socket";
import { useAuthStore } from "@/stores/auth";
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

  watch(
    () => auth.user?.id,
    userId => {
      disconnectSocket();
      messages.$reset();

      const token = getToken();
      if (userId === undefined || !token) return;

      connectSocket(token, {
        // Sent after every (re)connect: fetch what was posted while we were not connected
        ready: () => void messages.resync(),
        "message:new": message => messages.receive(message)
      });
    },
    // Run at the moment the user changes, before any page starts loading messages
    { flush: "sync" }
  );
});
