/**
 * WebSocket connection to the BeBe backend (Socket.IO, see backend/app/services/ws.ts).
 * https://socket.io/docs/v4/client-initialization/
 *
 * The backend pushes events here; every change of data still goes through the
 * REST API. The one thing the client sends is the text being written (UC11),
 * which is never stored.
 * The socket authenticates with the same access token as the API.
 * It is opened and closed in src/boot/realtime.ts.
 */
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/services/api";
import type { AuthUser, Status } from "@/stores/auth";
import type { ServerChannel } from "@/stores/channels";
import type { ServerMessage } from "@/stores/messages";

/** UC11: what a member of a channel is writing right now. An empty draft means they stopped. */
export interface TypingEvent {
  channelId: number;
  userId: number;
  nickName: string;
  draft: string;
}

/** Events the server sends, with their payloads. */
export interface ServerEvents {
  /**
   * The server has put this socket into the rooms of the user's channels.
   * Sent after every connect and reconnect, and when the user comes back from
   * the offline status (UC9); from here on no event is missed.
   */
  ready: () => void;
  /** A message was posted in one of the user's channels (UC3). */
  "message:new": (message: ServerMessage) => void;
  /** Someone joined, left or was removed from one of the user's channels (UC2, UC10). */
  "channel:members": (event: { channelId: number }) => void;
  /** One of the user's channels stopped existing (UC2, UC5). */
  "channel:deleted": (event: { channelId: number }) => void;
  /** The user was invited to a channel (UC2, UC4). */
  "channel:invited": (channel: ServerChannel) => void;
  /** The user was removed from a channel by /revoke or banned by /kick (UC4). */
  "channel:removed": (event: {
    channelId: number;
    reason: "revoked" | "banned";
  }) => void;
  /** A member of one of the user's channels changed their status (UC9). */
  "user:status": (event: { userId: number; status: Status }) => void;
  /** The user changed their own settings in another tab (UC8, UC9). */
  "user:updated": (user: AuthUser) => void;
  /** A member of one of the user's channels is writing (UC11). */
  typing: (event: TypingEvent) => void;
}

/** Events the client sends. */
interface ClientEvents {
  "channel:subscribe": (channelId: number, ack: (ok: boolean) => void) => void;
  typing: (event: { channelId: number; draft: string }) => void;
}

let socket: Socket<ServerEvents, ClientEvents> | null = null;

/**
 * Opens the connection, replacing an earlier one. When the network drops,
 * Socket.IO reconnects by itself and the server sends "ready" again.
 */
export function connectSocket(token: string, handlers: ServerEvents) {
  disconnectSocket();
  socket = io(new URL(API_URL).origin, {
    auth: { token },
    // Plain WebSocket; the HTTP long-polling fallback is not needed in current browsers
    transports: ["websocket"]
  });
  socket.on("ready", handlers.ready);
  socket.on("message:new", handlers["message:new"]);
  socket.on("channel:members", handlers["channel:members"]);
  socket.on("channel:deleted", handlers["channel:deleted"]);
  socket.on("channel:invited", handlers["channel:invited"]);
  socket.on("channel:removed", handlers["channel:removed"]);
  socket.on("user:status", handlers["user:status"]);
  socket.on("user:updated", handlers["user:updated"]);
  socket.on("typing", handlers.typing);
  socket.on("connect_error", error =>
    console.warn("BeBe live updates are unavailable:", error.message)
  );
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * Asks for the live events of a channel. The server already sends them for
 * every channel the user had joined when connecting; this covers a channel
 * joined later. The server checks the membership.
 */
export function subscribeToChannel(channelId: number) {
  socket?.emit("channel:subscribe", channelId, () => {});
}

/**
 * UC11: tells the other members of a channel what the user is writing.
 * The server passes it on only if the user is a member of the channel.
 */
export function sendTyping(channelId: number, draft: string) {
  socket?.emit("typing", { channelId, draft });
}
