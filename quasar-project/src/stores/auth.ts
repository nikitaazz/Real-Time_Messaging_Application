import { acceptHMRUpdate, defineStore } from "pinia";
import { api, getToken, setToken } from "@/services/api";
import { useMessagesStore } from "@/stores/messages";
import {
  useChatStore,
  type Member,
  type Presence
} from "@/stores/example-store";

/** The logged-in user, as returned by the backend (UserTransformer). */
export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  nickName: string;
  email: string;
  status: "online" | "dnd" | "offline";
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

const presence: Record<AuthUser["status"], Presence> = {
  online: "Online",
  dnd: "DND",
  offline: "Offline"
};

/**
 * Bridges the real account into the chat store, which still uses mock
 * channels and messages until they are moved to the backend (UC2, UC3).
 */
function startChatSession(user: AuthUser) {
  const chat = useChatStore();
  const member: Member = {
    id: String(user.id),
    name: user.nickName,
    firstName: user.firstName,
    lastName: user.lastName,
    nickName: user.nickName,
    status: presence[user.status]
  };
  chat.startSession(member);
  chat.$patch({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    nickName: user.nickName,
    mentionOnly: user.mentionOnly
  });
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as AuthUser | null,
    /** Whether a token saved by an earlier visit has already been checked. */
    restored: false
  }),
  getters: {
    isLoggedIn: state => state.user !== null
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
        startChatSession(data);
      } catch {
        // Invalid token: api() already removed it. Server offline: the user logs in again.
      }
    },
    startSession(user: AuthUser, token: string) {
      setToken(token);
      this.user = user;
      this.restored = true;
      startChatSession(user);
    },
    clearSession() {
      setToken(null);
      this.user = null;
      useChatStore().logout();
      useMessagesStore().$reset();
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
