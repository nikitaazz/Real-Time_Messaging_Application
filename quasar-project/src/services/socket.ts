/**
 * WebSocket connection to the BeBe backend (Socket.IO, see backend/app/services/ws.ts).
 * https://socket.io/docs/v4/client-initialization/
 *
 * The backend only pushes events here; every change still goes through the REST API.
 * The socket authenticates with the same access token as the API.
 */
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/services/api";

/** Events the server sends, with their payloads. */
export interface ServerEvents {
  ready: () => void;
  "message:new": (message: import("@/stores/messages").ServerMessage) => void;
}

/** Events the client sends. */
interface ClientEvents {
  "channel:subscribe": (channelId: number, ack: (ok: boolean) => void) => void;
}

let socket: Socket<ServerEvents, ClientEvents> | null = null;

/** Opens the connection, replacing an earlier one. Socket.IO reconnects by itself after network errors. */
export function connectSocket(token: string, handlers: Partial<ServerEvents>) {
  disconnectSocket();
  socket = io(new URL(API_URL).origin, {
    auth: { token },
    transports: ["websocket"]
  });
  for (const [event, handler] of Object.entries(handlers))
    socket.on(event as keyof ServerEvents, handler as never);
  socket.on("connect_error", error =>
    console.warn("BeBe live updates are unavailable:", error.message)
  );
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * Asks for a channel's live events. Needed for channels joined after the
 * connection was opened; the server checks the membership.
 */
export function subscribeToChannel(channelId: number) {
  socket?.emit("channel:subscribe", channelId, () => {});
}
