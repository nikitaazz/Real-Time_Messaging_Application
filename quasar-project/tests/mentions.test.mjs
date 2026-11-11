import assert from "node:assert/strict";
import { test } from "node:test";
import { splitMentions } from "../src/utils/mentions.ts";

test("a message without mentions is one plain part", () => {
  assert.deepEqual(splitMentions("Hello everyone", []), [
    { text: "Hello everyone", mention: false }
  ]);
});

test("the nicknames the server reports are highlighted", () => {
  assert.deepEqual(splitMentions("Hi @ed, meet @mira!", ["ed", "mira"]), [
    { text: "Hi ", mention: false },
    { text: "@ed", mention: true },
    { text: ", meet ", mention: false },
    { text: "@mira", mention: true },
    { text: "!", mention: false }
  ]);
});

test("@someone who is not in the channel stays plain text", () => {
  assert.deepEqual(splitMentions("Ask @nobody or @ed", ["ed"]), [
    { text: "Ask @nobody or ", mention: false },
    { text: "@ed", mention: true }
  ]);
});

test("an email address is not a mention", () => {
  assert.deepEqual(splitMentions("Write to ed@example.com", ["example"]), [
    { text: "Write to ed@example.com", mention: false }
  ]);
});

test("nicknames are matched in any letter case", () => {
  assert.deepEqual(splitMentions("@ED look", ["ed"]), [
    { text: "@ED", mention: true },
    { text: " look", mention: false }
  ]);
});
