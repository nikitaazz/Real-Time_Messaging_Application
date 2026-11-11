import { acceptHMRUpdate, defineStore } from "pinia";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useMessagesStore } from "@/stores/messages";
import { useTypingStore } from "@/stores/typing";

/** A channel as the backend returns it for the logged-in user (ChannelTransformer). */
export interface ServerChannel {
  id: number;
  name: string;
  isPrivate: boolean;
  /** The admin: the user who created the channel */
  ownerId: number;
  lastActivityAt: string;
  /** "invited": shown highlighted at the top of the list, not joined yet */
  state: "invited" | "joined";
}

/** The server's answer to /kick (UC4). */
export interface KickResult {
  nickName: string;
  /** The user is banned: by the admin's kick, or by the last vote needed */
  banned: boolean;
  /** How many different members have kicked the user so far */
  votes: number;
  votesNeeded: number;
}

/**
 * UC2 channel list, UC4 channel commands and UC5 /cancel, backed by the API.
 * Also keeps which channel is open, the unread counters and the notice line
 * that answers commands.
 */
export const useChannelsStore = defineStore("channels", {
  state: () => ({
    /** The channels the user has joined or is invited to. */
    list: [] as ServerChannel[],
    /** The channel whose messages are shown. Always a joined one. */
    selectedId: null as number | null,
    /** Messages that arrived in a channel while another one was open. */
    unread: {} as Record<number, number>,
    /** Feedback shown above the messages: the result of a command, or an error. */
    notice: "",
    /** The list has been fetched at least once since login. */
    loaded: false,
    /** The request that is fetching the list right now, shared by concurrent callers. */
    pending: null as Promise<void> | null
  }),
  getters: {
    /** UC2: invitations first (they are highlighted), then by name. */
    sorted: state =>
      [...state.list].sort(
        (first, second) =>
          Number(second.state === "invited") -
            Number(first.state === "invited") ||
          first.name.localeCompare(second.name)
      ),
    selected: state =>
      state.list.find(
        channel => channel.id === state.selectedId && channel.state === "joined"
      ) ?? null
  },
  actions: {
    /**
     * UC2: fetches the user's channels and invitations. Called after login,
     * and again whenever the live connection is re-established, because the
     * list may have changed while we were not connected.
     */
    load() {
      this.pending ??= this.fetchList().finally(() => {
        this.pending = null;
      });
      return this.pending;
    },

    async fetchList() {
      const auth = useAuthStore();
      const userId = auth.user?.id;
      const { data } = await api<{ data: ServerChannel[] }>("/channels");
      // The user logged out (or another one logged in) while the request was running
      if (userId === undefined || auth.user?.id !== userId) return;

      const ids = new Set(data.map(channel => channel.id));
      for (const old of this.list) if (!ids.has(old.id)) this.forget(old.id);

      this.list = data;
      this.loaded = true;
      this.keepSelectionValid();
    },

    /** Opens a joined channel and marks its messages as read. */
    select(channelId: number) {
      const channel = this.list.find(item => item.id === channelId);
      if (channel?.state !== "joined") return;
      this.selectedId = channelId;
      delete this.unread[channelId];
    },

    /** Selects another joined channel when the selected one is gone. */
    keepSelectionValid() {
      if (this.selected) return;
      const next = this.sorted.find(channel => channel.state === "joined");
      if (next) this.select(next.id);
      else this.selectedId = null;
    },

    /** Adds a channel to the list, or replaces what was known about it. */
    put(channel: ServerChannel) {
      const index = this.list.findIndex(item => item.id === channel.id);
      if (index === -1) this.list.push(channel);
      else this.list[index] = channel;
    },

    /**
     * UC4: "/join channelName [private]", the create dialog, and accepting an
     * invitation. The server creates the channel when the name is free.
     * The joined channel becomes the selected one.
     */
    async join(name: string, isPrivate = false) {
      const { data } = await api<{ data: ServerChannel }>("/channels/join", {
        method: "POST",
        body: { name, isPrivate }
      });
      this.put(data);
      this.select(data.id);
      return data;
    },

    /**
     * UC5: "/cancel" - leave a channel. The server deletes the channel when
     * the admin leaves. Also declines an invitation.
     */
    async leave(channelId: number) {
      await api(`/channels/${channelId}/membership`, { method: "DELETE" });
      this.remove(channelId);
    },

    /** UC4: "/quit" - the admin closes the channel for everyone. */
    async close(channelId: number) {
      await api(`/channels/${channelId}`, { method: "DELETE" });
      this.remove(channelId);
    },

    /** UC4: "/invite nickName". The invited user finds the channel at the top of their list. */
    async invite(channelId: number, nickName: string) {
      await api(`/channels/${channelId}/invite`, {
        method: "POST",
        body: { nickName }
      });
    },

    /** UC4: "/revoke nickName" - the admin of a private channel removes a user. */
    async revoke(channelId: number, nickName: string) {
      await api(`/channels/${channelId}/revoke`, {
        method: "POST",
        body: { nickName }
      });
    },

    /**
     * UC4: "/kick nickName" in a public channel. The admin's kick bans at
     * once; a member's kick is a vote, and the third vote bans.
     */
    async kick(channelId: number, nickName: string) {
      const { data } = await api<{ data: KickResult }>(
        `/channels/${channelId}/kick`,
        { method: "POST", body: { nickName } }
      );
      return data;
    },

    /** Takes a channel out of the list (UC2). Returns it, if it was there. */
    remove(channelId: number) {
      const channel = this.list.find(item => item.id === channelId);
      if (!channel) return null;
      this.list = this.list.filter(item => item.id !== channelId);
      this.forget(channelId);
      this.keepSelectionValid();
      return channel;
    },

    /** Drops everything that was loaded for a channel. */
    forget(channelId: number) {
      delete this.unread[channelId];
      useMessagesStore().forget(channelId);
      useTypingStore().forget(channelId);
    },

    /** Adds to the unread counter of a channel, unless it is the one being read. */
    markUnread(channelId: number, count: number) {
      if (count === 0 || this.selectedId === channelId) return;
      this.unread[channelId] = (this.unread[channelId] ?? 0) + count;
    },

    /**
     * Pushed by the server: a channel stopped existing (closed by its admin,
     * or 30 days without a message).
     */
    onDeleted(channelId: number) {
      // Null when this user closed it themselves: it is already gone from the list
      const channel = this.remove(channelId);
      if (channel) this.notice = `#${channel.name} no longer exists.`;
    },

    /** Pushed by the server: someone invited the user to a channel (UC2). */
    onInvited(channel: ServerChannel) {
      const known = this.list.find(item => item.id === channel.id);
      if (known?.state === "joined") return;
      this.put(channel);
      this.notice = `You were invited to #${channel.name}. Select it in the channel list to join.`;
    },

    /** Pushed by the server: the user was removed by /revoke or banned by /kick (UC2, UC4). */
    onRemoved(event: { channelId: number; reason: "revoked" | "banned" }) {
      const channel = this.remove(event.channelId);
      if (!channel) return;
      if (event.reason === "banned")
        this.notice = `You were banned from #${channel.name}.`;
      else if (channel.state === "invited")
        this.notice = `Your invitation to #${channel.name} was taken back.`;
      else this.notice = `You were removed from #${channel.name}.`;
    },

    /** Pushed by the server: someone joined, left or was removed from a channel (UC10). */
    onMembersChanged(channelId: number) {
      const messages = useMessagesStore();
      // Only worth refetching for a channel whose member list is already shown
      if (!(channelId in messages.members)) return;
      void messages.loadMembers(channelId).catch(() => {
        // Not a member any more, or offline: the list is reloaded when the channel is opened
      });
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChannelsStore, import.meta.hot));
}
