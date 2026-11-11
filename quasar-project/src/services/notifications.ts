/**
 * UC8: browser notifications for new messages.
 *
 * Quasar has no plugin that shows system notifications, so this uses the
 * browser's Notifications API directly:
 * https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
 * Whether the app is visible comes from Quasar's AppVisibility plugin:
 * https://quasar.dev/options/app-visibility
 *
 * The rules (when a notification is shown) are in src/utils/notifications.ts.
 */
import { AppVisibility } from "quasar";
import { useAuthStore } from "@/stores/auth";
import type { ServerChannel } from "@/stores/channels";
import type { ServerMessage } from "@/stores/messages";
import {
  notificationBlocker,
  notificationText,
  type NotificationAccess
} from "@/utils/notifications";

const ICON = "icons/icon-192x192.png";

let clickHandler: ((channelId: number) => void) | null = null;

/** What to do when the user clicks a message notification. Set once, in src/boot/realtime.ts. */
export function onNotificationClick(handler: (channelId: number) => void) {
  clickHandler = handler;
}

export function notificationAccess(): NotificationAccess {
  return typeof Notification === "undefined"
    ? "unsupported"
    : Notification.permission;
}

/**
 * Shows a system notification. Clicking it brings the app to the front.
 * Returns false when the browser refused.
 */
export function showNotification(
  title: string,
  body: string,
  tag: string,
  onClick?: () => void
) {
  if (notificationAccess() !== "granted") return false;
  try {
    const notification = new Notification(title, { body, tag, icon: ICON });
    notification.addEventListener("click", () => {
      window.focus();
      onClick?.();
      notification.close();
    });
  } catch {
    // Chrome on Android only allows notifications through the service worker,
    // which exists in the installed (PWA) build
    void navigator.serviceWorker?.ready
      .then(registration =>
        registration.showNotification(title, { body, tag, icon: ICON })
      )
      .catch(() => {});
  }
  return true;
}

/**
 * Called for every message that arrives live from another user.
 * Shows a notification with the sender and a part of the message, unless a
 * rule says no. Returns the reason when nothing was shown, otherwise null.
 */
export function notifyMessage(channel: ServerChannel, message: ServerMessage) {
  const user = useAuthStore().user;
  if (!user) return "Not logged in.";

  const nickName = user.nickName.toLowerCase();
  const blocker = notificationBlocker({
    appVisible: AppVisibility.appVisible,
    status: user.status,
    mentionOnly: user.mentionOnly,
    mentionsUser: message.mentions.some(
      name => name.toLowerCase() === nickName
    ),
    access: notificationAccess()
  });
  if (blocker) return blocker;

  const { title, body } = notificationText(
    message.author,
    channel.name,
    message.body
  );
  // The tag makes the browser show one notification per message, even with several tabs open
  showNotification(title, body, `bebe-message-${message.id}`, () =>
    clickHandler?.(channel.id)
  );
  return null;
}
