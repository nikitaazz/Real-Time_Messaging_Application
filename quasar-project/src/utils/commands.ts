/**
 * UC3, UC4, UC5, UC10: the commands of the command line.
 *
 * This file only reads what the user typed. Carrying a command out is done by
 * the chat page (src/pages/index/main.vue) through the stores, and the rules
 * (who may do what) are enforced by the backend.
 */

export type Command =
  /** /join channelName [private] - join a channel, or create it when the name is free */
  | { name: "join"; channel: string; isPrivate: boolean }
  /** /invite, /revoke, /kick nickName - act on another user in the open channel */
  | { name: "invite" | "revoke" | "kick"; nickName: string }
  /** /cancel (leave), /quit (close, admin only), /list (members), /help */
  | { name: "cancel" | "quit" | "list" | "help" }
  /** Not a valid command; the message says how to write it */
  | { name: "invalid"; message: string };

/** One line per command, shown by /help and under the command line. */
export const COMMAND_HELP = [
  "/join channelName [private] - join or create a channel",
  "/invite nickName - invite a user to this channel",
  "/revoke nickName - remove a user from this private channel (admin)",
  "/kick nickName - kick a user from this public channel",
  "/cancel - leave this channel (the admin closes it)",
  "/quit - close this channel (admin)",
  "/list - show the members of this channel"
];

const invalid = (message: string): Command => ({ name: "invalid", message });

/**
 * Turns a line that starts with "/" into a command.
 * "#" before a channel name and "@" before a nickname are optional.
 */
export function parseCommand(text: string): Command {
  const [word = "", ...args] = text.trim().split(/\s+/);
  const name = word.toLowerCase();

  switch (name) {
    case "/join": {
      const [channel, visibility] = args;
      if (
        !channel ||
        args.length > 2 ||
        (visibility && visibility !== "private")
      )
        return invalid("Use /join channelName [private].");
      return {
        name: "join",
        channel: channel.replace(/^#/, ""),
        isPrivate: visibility === "private"
      };
    }
    case "/invite":
    case "/revoke":
    case "/kick": {
      const [nickName] = args;
      if (!nickName || args.length > 1) return invalid(`Use ${name} nickName.`);
      return {
        name: name.slice(1) as "invite" | "revoke" | "kick",
        nickName: nickName.replace(/^@/, "")
      };
    }
    case "/cancel":
    case "/quit":
    case "/list":
    case "/help":
      if (args.length > 0) return invalid(`${name} takes no arguments.`);
      return { name: name.slice(1) as "cancel" | "quit" | "list" | "help" };
    default:
      return invalid(
        `Unknown command ${word}. Type /help to see the commands.`
      );
  }
}
