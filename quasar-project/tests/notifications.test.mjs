import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createPinia, setActivePinia } from "pinia";
import { useChatStore } from "../src/stores/example-store.ts";

const globals = ["document", "navigator", "Notification"];
const originalDescriptors = globals.map(name =>
  Object.getOwnPropertyDescriptor(globalThis, name)
);
let store;
let desktopAlerts;

beforeEach(() => {
  setActivePinia(createPinia());
  store = useChatStore();
  store.login("alex@example.com", "alex");
  desktopAlerts = [];
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState: "visible" }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {}
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: class {
      static permission = "granted";
      constructor(title, options) {
        desktopAlerts.push({ title, options });
      }
    }
  });
});

afterEach(() => {
  globals.forEach((name, index) => {
    const descriptor = originalDescriptors[index];
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  });
});

test("visible demo messages update chat and the in-app banner only", () => {
  const before = store.selectedChannel.messages.length;
  assert.equal(store.receiveTestMessage(), true);
  const message = store.selectedChannel.messages.at(-1);
  assert.equal(store.selectedChannel.messages.length, before + 1);
  assert.equal(store.inAppNotification.body, message.body);
  assert.equal(store.inAppNotification.channelId, "general");
  assert.equal(desktopAlerts.length, 0);
});

test("hidden demo messages keep a banner as well as sending a desktop alert", () => {
  document.visibilityState = "hidden";
  store.receiveTestMessage();
  const message = store.selectedChannel.messages.at(-1);
  assert.equal(desktopAlerts.length, 1);
  assert.equal(desktopAlerts[0].options.body, `${message.author}: ${message.body}`);
  document.visibilityState = "visible";
  assert.equal(store.inAppNotification.body, message.body);
});

test("blocked desktop permission does not lose the message or in-app banner", () => {
  document.visibilityState = "hidden";
  Notification.permission = "denied";
  store.receiveTestMessage();
  assert.equal(desktopAlerts.length, 0);
  assert.equal(store.inAppNotification.body, store.selectedChannel.messages.at(-1).body);
});

test("delayed messages keep their original channel and cannot be queued twice", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const general = store.selectedChannel;
  const before = general.messages.length;
  assert.equal(store.scheduleTestMessage(), true);
  assert.equal(store.scheduleTestMessage(), false);
  store.selectChannel("project");
  context.mock.timers.tick(4999);
  assert.equal(general.messages.length, before);
  context.mock.timers.tick(1);
  assert.equal(general.messages.length, before + 1);
  assert.equal(store.inAppNotification.channelId, general.id);
  assert.equal(store.testMessageQueued, false);
});

test("a scheduled message cannot leak into a new login session", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  store.scheduleTestMessage();
  store.logout();
  store.login("other@example.com", "other");
  const before = store.selectedChannel.messages.length;
  context.mock.timers.tick(5000);
  assert.equal(store.selectedChannel.messages.length, before);
  assert.equal(store.inAppNotification, null);
});

test("notification preferences suppress alerts without hiding chat messages", () => {
  const before = store.selectedChannel.messages.length;
  store.notifications = false;
  store.receiveTestMessage();
  store.notifications = true;
  store.setPresence("DND");
  store.receiveTestMessage();
  assert.equal(store.selectedChannel.messages.length, before + 2);
  assert.equal(store.inAppNotification, null);
  assert.equal(desktopAlerts.length, 0);
});

test("offline delayed messages appear when the user returns online", context => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const before = store.selectedChannel.messages.length;
  store.scheduleTestMessage();
  store.setPresence("Offline");
  context.mock.timers.tick(5000);
  assert.equal(store.selectedChannel.messages.length, before);
  assert.equal(store.pendingMessages.length, 1);
  store.setPresence("Online");
  assert.equal(store.selectedChannel.messages.length, before + 1);
  assert.equal(store.inAppNotification.body, store.selectedChannel.messages.at(-1).body);
});

test("the demo mentions the recipient and never masquerades as their own message", () => {
  store.login("nikita@example.com", "nikita");
  store.mentionOnly = true;
  store.receiveTestMessage();
  const message = store.selectedChannel.messages.at(-1);
  assert.notEqual(message.author, store.user.nickName);
  assert.equal(message.mentions.includes("nikita"), true);
  assert.equal(store.inAppNotification.body, message.body);
});