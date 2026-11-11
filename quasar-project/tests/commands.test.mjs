import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMAND_HELP, parseCommand } from "../src/utils/commands.ts";

test("/join reads the channel name and the optional private flag", () => {
  assert.deepEqual(parseCommand("/join general"), {
    name: "join",
    channel: "general",
    isPrivate: false
  });
  assert.deepEqual(parseCommand("  /join   #secret   private "), {
    name: "join",
    channel: "secret",
    isPrivate: true
  });
});

test("/join without a name, or with something other than private, is explained", () => {
  for (const text of ["/join", "/join general public", "/join a private b"])
    assert.deepEqual(parseCommand(text), {
      name: "invalid",
      message: "Use /join channelName [private]."
    });
});

test("/invite, /revoke and /kick take one nickname, with or without @", () => {
  assert.deepEqual(parseCommand("/invite ed"), {
    name: "invite",
    nickName: "ed"
  });
  assert.deepEqual(parseCommand("/revoke @mira"), {
    name: "revoke",
    nickName: "mira"
  });
  assert.deepEqual(parseCommand("/kick zed"), {
    name: "kick",
    nickName: "zed"
  });
});

test("a member command without exactly one nickname is explained", () => {
  assert.deepEqual(parseCommand("/invite"), {
    name: "invalid",
    message: "Use /invite nickName."
  });
  assert.deepEqual(parseCommand("/kick ed mira"), {
    name: "invalid",
    message: "Use /kick nickName."
  });
});

test("/cancel, /quit, /list and /help take no arguments", () => {
  for (const name of ["cancel", "quit", "list", "help"])
    assert.deepEqual(parseCommand(`/${name}`), { name });
  assert.deepEqual(parseCommand("/quit now"), {
    name: "invalid",
    message: "/quit takes no arguments."
  });
});

test("commands are recognised in any letter case", () => {
  assert.deepEqual(parseCommand("/LIST"), { name: "list" });
  // The nickname keeps its case; the server compares nicknames without it
  assert.deepEqual(parseCommand("/Invite Ed"), {
    name: "invite",
    nickName: "Ed"
  });
});

test("an unknown command points to /help", () => {
  assert.deepEqual(parseCommand("/dance"), {
    name: "invalid",
    message: "Unknown command /dance. Type /help to see the commands."
  });
});

test("/help lists every command of the assignment", () => {
  for (const command of [
    "/join",
    "/invite",
    "/revoke",
    "/kick",
    "/cancel",
    "/quit",
    "/list"
  ])
    assert.ok(
      COMMAND_HELP.some(line => line.startsWith(command)),
      `${command} is missing from the help`
    );
});
