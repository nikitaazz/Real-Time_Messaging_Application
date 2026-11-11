/**
 * UC8: the rules for message notifications, kept free of browser APIs so they
 * can be tested (tests/notifications.test.mjs). The part that talks to the
 * browser is in src/services/notifications.ts.
 */

/** The browser's answer to "may this site show notifications?" */
export type NotificationAccess =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export interface NotificationCheck {
  /** The app's window or tab can be seen (Quasar AppVisibility) */
  appVisible: boolean;
  /** UC9: the user's own status */
  status: "online" | "dnd" | "offline";
  /** The user wants notifications only for messages addressed to them */
  mentionOnly: boolean;
  /** The message mentions the user with @nickname (UC6) */
  mentionsUser: boolean;
  access: NotificationAccess;
}

/** Longest piece of a message shown in a notification. */
export const PREVIEW_LENGTH = 100;

/**
 * Why a new message raises no notification, or null when it does.
 * - only while the app is not visible
 * - never in the DND status (and an offline user receives no messages at all)
 * - with "mentions only" switched on, only for messages that mention the user
 */
export function notificationBlocker(check: NotificationCheck) {
  if (check.appVisible)
    return "BeBe is visible, so the message is already on screen.";
  if (check.status === "dnd") return "Your status is DND.";
  if (check.status === "offline") return "Your status is Offline.";
  if (check.mentionOnly && !check.mentionsUser)
    return "The message does not mention you.";
  if (check.access === "unsupported")
    return "This browser does not support notifications.";
  if (check.access !== "granted")
    return "Notifications are not allowed for BeBe in this browser.";
  return null;
}

/** The sender and a part of the message, as the notification shows them. */
export function notificationText(
  author: string,
  channelName: string,
  body: string
) {
  // A long message is cut, and line breaks would waste the little space there is
  const text = body.replace(/\s+/g, " ").trim();
  return {
    title: `${author} in #${channelName}`,
    body:
      text.length > PREVIEW_LENGTH
        ? `${text.slice(0, PREVIEW_LENGTH).trimEnd()}…`
        : text
  };
}
