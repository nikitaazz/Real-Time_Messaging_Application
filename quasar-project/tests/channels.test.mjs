import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createPinia, setActivePinia } from "pinia";
import { useChatStore } from "../src/stores/example-store.ts";

let store;

beforeEach(() => {
  setActivePinia(createPinia());
  store = useChatStore();
  store.login("alex@example.com", "alex");
});

test("a private channel owner invites a demo user into the member list", () => {
  store.runCommand("/join planning private");
  store.runCommand("/invite zahar");
  assert.equal(
    store.selectedChannel.members.some(person => person.nickName === "zahar"),
    true
  );
  assert.equal(store.commandHint, "Invited zahar to #planning.");
});

test("a non-owner cannot invite users into a private channel", () => {
  store.selectChannel("project");
  store.selectedChannel.ownerId = "n";
  store.runCommand("/invite zahar");
  assert.equal(
    store.selectedChannel.members.some(person => person.nickName === "zahar"),
    false
  );
  assert.equal(
    store.commandHint,
    "Only the channel owner can invite users to a private channel."
  );
});

test("any public channel member can invite another demo user", () => {
  store.runCommand("/join lobby");
  store.selectedChannel.ownerId = "n";
  store.runCommand("/invite mira");
  assert.equal(
    store.selectedChannel.members.some(person => person.nickName === "mira"),
    true
  );
  assert.equal(store.commandHint, "Invited mira to #lobby.");
});

test("a non-member cannot invite users into a public channel", () => {
  store.runCommand("/join lobby");
  store.selectedChannel.members = [];
  store.runCommand("/invite mira");
  assert.equal(store.selectedChannel.members.length, 0);
  assert.equal(store.commandHint, "Join a channel before inviting users.");
});

test("inviting an existing member reports the result without duplicating them", () => {
  const before = store.selectedChannel.members.length;
  store.runCommand("/invite nikita");
  assert.equal(store.selectedChannel.members.length, before);
  assert.equal(store.selectedChannel.invitedUserIds.includes("n"), false);
  assert.equal(store.commandHint, "nikita is already a member of #general.");
});

test("missing and unknown invite recipients produce feedback", () => {
  store.runCommand("/invite");
  assert.equal(store.commandHint, "Use /invite nickName.");
  store.runCommand("/invite unknown-user");
  assert.equal(store.commandHint, "No user found with nickname unknown-user.");
});

test("only a public channel owner can restore a banned user by inviting them", () => {
  store.runCommand("/join lobby");
  const item = store.selectedChannel;
  item.ownerId = "n";
  store.kickRecords.push({
    userId: "m",
    channelId: item.id,
    kickedBy: "n",
    permanent: true,
    createdAt: new Date().toISOString()
  });
  store.runCommand("/invite mira");
  assert.equal(
    item.members.some(person => person.id === "m"),
    false
  );
  assert.equal(store.kickRecords.length, 1);
  assert.equal(
    store.commandHint,
    "Only the channel owner can restore a banned member."
  );
  item.ownerId = store.user.id;
  store.runCommand("/invite mira");
  assert.equal(
    item.members.some(person => person.id === "m"),
    true
  );
  assert.equal(store.kickRecords.length, 0);
});

test("invites can resolve users already present in other prototype channels", () => {
  const participant = {
    id: "demo-user",
    name: "sam",
    firstName: "Sam",
    lastName: "Lee",
    nickName: "sam",
    status: "Online"
  };
  store.selectedChannel.members.push(participant);
  store.runCommand("/join lobby");
  store.runCommand("/invite sam");
  assert.equal(
    store.selectedChannel.members.some(person => person.id === participant.id),
    true
  );
});
