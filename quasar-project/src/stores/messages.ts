import { acceptHMRUpdate, defineStore } from "pinia";
import { api } from "@/services/api";
import { notifyMessage } from "@/services/notifications";
import { subscribeToChannel } from "@/services/socket";
import { useAuthStore, type Status } from "@/stores/auth";
import { useChannelsStore } from "@/stores/channels";
import { useTypingStore } from "@/stores/typing";

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
  status: Status;
}

interface ChannelHistory {
  /** Sorted by id, oldest first: the order the message list shows them in. */
  messages: ServerMessage[];
  /** False once a page came back shorter than PAGE_SIZE: there is nothing older. */
  hasMore: boolean;
  loading: boolean;
  /** The newest page has been fetched (the channel was opened at least once). */
  loaded: boolean;
}

/** Messages per history request (UC7). The backend allows up to 100. */
export const PAGE_SIZE = 20;

const emptyHistory = (): ChannelHistory => ({
  messages: [],
  hasMore: true,
  loading: false,
  loaded: false
});

/**
 * UC3 sending, UC6 mentions, UC7 history and UC10 members, backed by the API.
 * State is kept per channel, so switching back to a channel doesn't refetch it.
 *
 * Messages arrive in three ways: pages of history (REST), the answer to our
 * own POST, and live pushes over the WebSocket. All of them go through add(),
 * which keeps every channel's list sorted and free of duplicates.
 *
 * UC9: while the user's status is offline nothing is fetched or received.
 * resync() brings everything up to date when they are online again.
 */
export const useMessagesStore = defineStore("messages", {
  state: () => ({
    histories: {} as Record<number, ChannelHistory>,
    members: {} as Record<number, ChannelMember[]>,
    /** UC8: why the latest incoming message raised no notification ("" when it did). */
    lastNotificationResult: ""
  }),
  getters: {
    messagesFor: state => (channelId: number) =>
      state.histories[channelId]?.messages ?? [],
    hasMoreFor: state => (channelId: number) =>
      state.histories[channelId]?.hasMore ?? true,
    membersFor: state => (channelId: number) => state.members[channelId] ?? []
  },
  actions: {
    history(channelId: number) {
      if (!this.histories[channelId])
        this.histories[channelId] = emptyHistory();
      // Read it back through the store: that returns the reactive proxy, so changes
      // re-render the message list. ("??=" would return the plain, unobserved object.)
      return this.histories[channelId];
    },

    /**
     * Puts a message into its channel's list, at its place by id (normally the end).
     * Returns false when the message was already there.
     */
    add(message: ServerMessage) {
      const list = this.history(message.channelId).messages;
      let index = list.length;
      while (index > 0 && list[index - 1]!.id > message.id) index--;
      if (index > 0 && list[index - 1]!.id === message.id) return false;
      list.splice(index, 0, message);
      return true;
    },

    /** Fetches one page, newest first, older than the message with id "before". */
    fetchPage(channelId: number, before?: number) {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (before !== undefined) query.set("before", String(before));
      return api<{ data: ServerMessage[] }>(
        `/channels/${channelId}/messages?${query}`
      );
    },

    /**
     * Called when the user opens a channel: asks for its live events and loads
     * the newest messages (UC7) and the members with their status (UC10).
     */
    async open(channelId: number) {
      // UC9: an offline user gets no messages; resync() opens the channel later
      if (useAuthStore().isOffline) return;
      subscribeToChannel(channelId);
      await Promise.all([
        this.loadLatest(channelId),
        this.loadMembers(channelId)
      ]);
    },

    /** Loads the newest page the first time a channel is opened. */
    async loadLatest(channelId: number) {
      const history = this.history(channelId);
      if (history.loaded || history.loading) return;
      history.loading = true;
      try {
        const { data } = await this.fetchPage(channelId);
        // Oldest first. A message pushed live while this request was running is
        // already in the list; add() skips it.
        for (const message of data.reverse()) this.add(message);
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
    async loadOlder(channelId: number) {
      const history = this.history(channelId);
      const oldest = history.messages[0];
      if (!history.loaded || !history.hasMore || history.loading || !oldest)
        return 0;
      history.loading = true;
      try {
        const { data } = await this.fetchPage(channelId, oldest.id);
        // The page is newest first and everything in it is older than what is shown
        history.messages.unshift(...data.reverse());
        history.hasMore = data.length === PAGE_SIZE;
        return data.length;
      } finally {
        history.loading = false;
      }
    },

    /** UC3: posts a message. The server answers with it, including mentions. */
    async send(channelId: number, body: string) {
      const { data } = await api<{ data: ServerMessage }>(
        `/channels/${channelId}/messages`,
        { method: "POST", body: { body } }
      );
      this.add(data);
      return data;
    },

    /** UC10: members of a channel with their status. */
    async loadMembers(channelId: number) {
      const { data } = await api<{ data: ChannelMember[] }>(
        `/channels/${channelId}/members`
      );
      this.members[channelId] = data;
      return data;
    },

    /** UC9, pushed by the server: a member changed their status. */
    setStatus(userId: number, status: Status) {
      for (const list of Object.values(this.members))
        for (const member of list)
          if (member.id === userId) member.status = status;
    },

    /**
     * A message pushed by the server over the WebSocket: from another member,
     * or from this user in another tab. Messages from others count as unread
     * and may raise a notification (UC8).
     */
    receive(message: ServerMessage) {
      // False for our own message when the answer to the POST came first
      if (!this.add(message)) return;
      // The author has sent what they were writing (UC11)
      useTypingStore().clear(message.channelId, message.authorId);
      if (message.authorId === useAuthStore().user?.id) return;

      const channels = useChannelsStore();
      channels.markUnread(message.channelId, 1);

      const channel = channels.list.find(item => item.id === message.channelId);
      if (channel)
        this.lastNotificationResult = notifyMessage(channel, message) ?? "";
    },

    /**
     * Called every time the server says "ready": after the live connection is
     * (re)established, and when the user comes back from the offline status (UC9).
     * Messages posted meanwhile were not pushed to us, so everything that is
     * already loaded is brought up to date, and the open channel is loaded if
     * it could not be before. Never rejects: what fails is retried next time.
     */
    async resync() {
      if (useAuthStore().isOffline) return;
      const selectedId = useChannelsStore().selectedId;
      const loaded = Object.keys(this.histories)
        .map(Number)
        .filter(channelId => this.histories[channelId]?.loaded);
      const withMembers = Object.keys(this.members).map(Number);

      await Promise.allSettled([
        ...loaded.map(channelId => this.catchUp(channelId)),
        ...withMembers.map(channelId => this.loadMembers(channelId)),
        ...(selectedId !== null && !loaded.includes(selectedId)
          ? [this.open(selectedId)]
          : [])
      ]);
    },

    /** Fetches the newest page of a channel and adds the messages we don't have yet. */
    async catchUp(channelId: number) {
      const { data } = await this.fetchPage(channelId);
      const page = data.reverse(); // oldest first
      const history = this.history(channelId);
      const newestKnown = history.messages.at(-1);
      const oldestFetched = page[0];
      const userId = useAuthStore().user?.id;
      let missed: ServerMessage[];

      if (
        newestKnown &&
        oldestFetched &&
        oldestFetched.id > newestKnown.id &&
        page.length === PAGE_SIZE
      ) {
        // A full page of messages we have never seen: more may be missing between
        // it and what we have. Start again from this page instead of showing a
        // list with a hole in it; scrolling up loads the rest (UC7).
        history.messages = page;
        history.hasMore = true;
        missed = page;
      } else {
        missed = page.filter(message => this.add(message));
      }

      useChannelsStore().markUnread(
        channelId,
        missed.filter(message => message.authorId !== userId).length
      );
    },

    /** Forgets a channel, e.g. after leaving it. */
    forget(channelId: number) {
      delete this.histories[channelId];
      delete this.members[channelId];
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMessagesStore, import.meta.hot));
}
