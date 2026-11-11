import { acceptHMRUpdate, defineStore } from "pinia";
import { api, ApiError, getToken, setToken } from "@/services/api";
import { useChannelsStore } from "@/stores/channels";

/** UC9: the states a user can set for themselves. */
export type Status = "online" | "dnd" | "offline";

/** How a status is shown to users. */
export const STATUS_LABELS: Record<Status, string> = {
  online: "Online",
  dnd: "DND",
  offline: "Offline"
};

/** The logged-in user, as returned by the backend (UserTransformer). */
export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  nickName: string;
  email: string;
  /** UC9: shown to the other members of the user's channels */
  status: Status;
  /** UC8: notify only for messages that mention the user */
  mentionOnly: boolean;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  nickName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface SessionResponse {
  data: { user: AuthUser; token: string };
}

/** UC2: fetches the channel list of the user who just logged in. */
function loadChannels() {
  const channels = useChannelsStore();
  void channels.load().catch(reason => {
    channels.notice =
      reason instanceof ApiError
        ? reason.message
        : "Your channels could not be loaded.";
  });
}

/**
 * UC1 accounts: register, log in, log out, and staying logged in after a reload.
 * Also the user's own settings: status (UC9) and "mentions only" (UC8).
 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as AuthUser | null,
    /** Whether a token saved by an earlier visit has already been checked. */
    restored: false
  }),
  getters: {
    isLoggedIn: state => state.user !== null,
    /** UC9: an offline user receives no messages until they go online again. */
    isOffline: state => state.user?.status === "offline"
  },
  actions: {
    async register(payload: RegisterPayload) {
      const { data } = await api<SessionResponse>("/auth/register", {
        method: "POST",
        body: payload
      });
      this.startSession(data.user, data.token);
    },
    async login(email: string, password: string) {
      const { data } = await api<SessionResponse>("/auth/login", {
        method: "POST",
        body: { email, password }
      });
      this.startSession(data.user, data.token);
    },
    async logout() {
      try {
        if (getToken()) await api("/auth/logout", { method: "POST" });
      } catch {
        // The token may already be invalid or the server offline; log out locally anyway.
      } finally {
        this.clearSession();
      }
    },
    /** Logs the user back in after a page reload, using the saved token. */
    async restore() {
      if (this.restored) return;
      this.restored = true;
      if (!getToken() || this.user) return;
      try {
        const { data } = await api<{ data: AuthUser }>("/auth/me");
        this.user = data;
        loadChannels();
      } catch {
        // Invalid token: api() already removed it. Server offline: the user logs in again.
      }
    },
    startSession(user: AuthUser, token: string) {
      setToken(token);
      this.user = user;
      this.restored = true;
      loadChannels();
    },
    clearSession() {
      setToken(null);
      this.user = null;
      useChannelsStore().$reset();
    },

    /**
     * UC8, UC9: changes the user's status or the "mentions only" setting.
     * The server saves it and tells the members of the user's channels.
     * After a change from offline to another status the server sends "ready",
     * which makes this app fetch everything it missed (see src/boot/realtime.ts).
     */
    async updateSettings(changes: { status?: Status; mentionOnly?: boolean }) {
      const { data } = await api<{ data: AuthUser }>("/auth/me", {
        method: "PATCH",
        body: changes
      });
      this.user = data;
    },

    /** Pushed by the server: the user changed their settings in another tab. */
    onUpdated(user: AuthUser) {
      if (this.user?.id === user.id) this.user = user;
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
