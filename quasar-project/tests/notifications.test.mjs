import assert from "node:assert/strict";
import { test } from "node:test";
import {
  notificationBlocker,
  notificationText,
  PREVIEW_LENGTH
} from "../src/utils/notifications.ts";

/** A message that does raise a notification; each test changes one thing. */
const hiddenAndAllowed = {
  appVisible: false,
  status: "online",
  mentionOnly: false,
  mentionsUser: false,
  access: "granted"
};

test("a message raises a notification while the app is not visible", () => {
  assert.equal(notificationBlocker(hiddenAndAllowed), null);
});

test("no notification while the app is visible", () => {
  assert.match(
    notificationBlocker({ ...hiddenAndAllowed, appVisible: true }),
    /visible/
  );
});

test("no notification in the DND and Offline statuses", () => {
  assert.match(
    notificationBlocker({ ...hiddenAndAllowed, status: "dnd" }),
    /DND/
  );
  assert.match(
    notificationBlocker({ ...hiddenAndAllowed, status: "offline" }),
    /Offline/
  );
});

test("with 'mentions only', just the messages that mention the user notify", () => {
  const mentionOnly = { ...hiddenAndAllowed, mentionOnly: true };
  assert.match(notificationBlocker(mentionOnly), /does not mention you/);
  assert.equal(
    notificationBlocker({ ...mentionOnly, mentionsUser: true }),
    null
  );
});

test("no notification without the browser's permission", () => {
  for (const access of ["default", "denied"])
    assert.match(
      notificationBlocker({ ...hiddenAndAllowed, access }),
      /not allowed/
    );
  assert.match(
    notificationBlocker({ ...hiddenAndAllowed, access: "unsupported" }),
    /does not support/
  );
});

test("the notification names the sender and the channel", () => {
  assert.deepEqual(notificationText("ed", "general", "Lunch at noon?"), {
    title: "ed in #general",
    body: "Lunch at noon?"
  });
});

test("a long message is cut to a part of it", () => {
  const { body } = notificationText("ed", "general", "word ".repeat(100));
  assert.ok(body.length <= PREVIEW_LENGTH + 1);
  assert.ok(body.endsWith("…"));
  assert.ok("word ".repeat(100).startsWith(body.slice(0, -1)));
});

test("line breaks in a message become spaces", () => {
  assert.equal(
    notificationText("ed", "general", "first\n\nsecond").body,
    "first second"
  );
});
