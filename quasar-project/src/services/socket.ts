/**
 * WebSocket connection to the BeBe backend (Socket.IO, see backend/app/services/ws.ts).
 * https://socket.io/docs/v4/client-initialization/
 *
 * The backend only pushes events here; every change still goes through the REST API.
 * The socket authenticates with the same access token as the API.
 * It is opened and closed in src/boot/realtime.ts.
 */
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/services/api";
import type { ServerMessage } from "@/stores/messages";

/** Events the server sends, with their payloads. */
export interface ServerEvents {
  /**
   * The server has put this socket into the rooms of the user's channels.
   * Sent after every connect and reconnect; from here on no event is missed.
   */
  ready: () => void;
  /** A message was posted in one of the user's channels (UC3). */
  "message:new": (message: ServerMessage) => void;
}

/** Events the client sends. */
interface ClientEvents {
  "channel:subscribe": (channelId: number, ack: (ok: boolean) => void) => void;
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
