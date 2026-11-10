import { acceptHMRUpdate, defineStore } from "pinia";
import { api } from "@/services/api";

/** A message as returned by the backend (MessageTransformer). */
export interface ServerMessage {
  id: number;
  channelId: number;
  authorId: number;
  /** Author's nickname */
  author: string;
  body: string;
  createdAt: string;
  /** Nicknames of channel members addressed with @nickname (UC6) */
  mentions: string[];
}

/** A channel member for /list and the member panel (MemberTransformer). */
export interface ChannelMember {
  id: number;
  nickName: string;
  firstName: string;
  lastName: string;
  status: "online" | "dnd" | "offline";
}

interface ChannelHistory {
  /** Oldest first, the order the message list shows them in. */
  messages: ServerMessage[];
  /** False once a page came back shorter than PAGE_SIZE: there is nothing older. */
  hasMore: boolean;
  loading: boolean;
  loaded: boolean;
}

/** Messages per history request (UC7). The backend allows up to 100. */
export const PAGE_SIZE = 20;

/**
 * Channels from the backend have numeric ids; the mock channels still kept in
 * example-store have names as ids ("general"). Remove this check once the
 * channel list comes from the backend (UC2).
 */
export function isServerChannel(id: string | number | undefined) {
  return id !== undefined && /^\d+$/.test(String(id));
}

const emptyHistory = (): ChannelHistory => ({
  messages: [],
  hasMore: true,
  loading: false,
  loaded: false
});

/**
 * UC3 sending, UC6 mentions, UC7 history and UC10 members, backed by the API.
 * State is kept per channel, so switching back to a channel doesn't refetch it.
 */
export const useMessagesStore = defineStore("messages", {
  state: () => ({
    histories: {} as Record<string, ChannelHistory>,
    members: {} as Record<string, ChannelMember[]>
  }),
  getters: {
    messagesFor: state => (channelId: string | number) =>
      state.histories[String(channelId)]?.messages ?? [],
    hasMoreFor: state => (channelId: string | number) =>
      state.histories[String(channelId)]?.hasMore ?? true,
    membersFor: state => (channelId: string | number) =>
      state.members[String(channelId)] ?? []
  },
  actions: {
    history(channelId: string | number) {
      const key = String(channelId);
      return (this.histories[key] ??= emptyHistory());
    },

    /** Fetches one page, newest first, older than the message with id "before". */
    fetchPage(channelId: string | number, before?: number) {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (before !== undefined) query.set("before", String(before));
      return api<{ data: ServerMessage[] }>(
        `/channels/${channelId}/messages?${query}`
      );
    },

    /** Loads the newest page the first time a channel is opened. */
    async loadLatest(channelId: string | number) {
      const history = this.history(channelId);
      if (history.loaded || history.loading) return;
      history.loading = true;
      try {
        const { data } = await this.fetchPage(channelId);
        // A message sent while this request was running is already in the list
        const known = new Set(history.messages.map(message => message.id));
        history.messages = [
          ...data.reverse().filter(message => !known.has(message.id)),
          ...history.messages
        ];
        history.hasMore = data.length === PAGE_SIZE;
        history.loaded = true;
      } finally {
        history.loading = false;
      }
    },

    /**
     * UC7: loads the page before the oldest message shown (scrolling up).
     * Returns how many messages were added.
     */
    async loadOlder(channelId: string | number) {
      const history = this.history(channelId);
      const oldest = history.messages[0];
      if (!history.loaded || !history.hasMore || history.loading || !oldest)
        return 0;
      history.loading = true;
      try {
        const { data } = await this.fetchPage(channelId, oldest.id);
        history.messages.unshift(...data.reverse());
        history.hasMore = data.length === PAGE_SIZE;
        return data.length;
      } finally {
        history.loading = false;
      }
    },

    /** UC3: posts a message. The server answers with it, including mentions. */
    async send(channelId: string | number, body: string) {
      const { data } = await api<{ data: ServerMessage }>(
        `/channels/${channelId}/messages`,
        { method: "POST", body: { body } }
      );
      this.add(data);
      return data;
    },

    /** Adds a message to the end of its channel, unless it is already there. */
    add(message: ServerMessage) {
      const history = this.history(message.channelId);
      if (!history.messages.some(item => item.id === message.id))
        history.messages.push(message);
    },

    /** UC10: members of a channel with their status. */
    async loadMembers(channelId: string | number) {
      const { data } = await api<{ data: ChannelMember[] }>(
        `/channels/${channelId}/members`
      );
      this.members[String(channelId)] = data;
      return data;
    },

    /** Forgets a channel, e.g. after leaving it. */
    forget(channelId: string | number) {
      delete this.histories[String(channelId)];
      delete this.members[String(channelId)];
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMessagesStore, import.meta.hot));
}
