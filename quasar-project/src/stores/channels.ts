import { acceptHMRUpdate, defineStore } from "pinia";
import { api } from "@/services/api";
import { useChatStore, type Channel } from "@/stores/example-store";
import { useMessagesStore } from "@/stores/messages";

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

/**
 * UC2 channel list, UC4 /join and /quit, UC5 /cancel, backed by the API.
 *
 * The chat page still reads the list from the chat store (example-store), so
 * this store keeps `chat.channels` in step with the backend. Backend channels
 * get their numeric id as a string, which is also the key the messages store
 * and the unread counters use.
 */
export const useChannelsStore = defineStore("channels", {
  state: () => ({
    /** The list has been fetched at least once since login. */
    loaded: false,
    /** The request that is fetching the list right now, shared by concurrent callers. */
    pending: null as Promise<void> | null
  }),
  actions: {
    /** Converts a backend channel to the shape the chat page displays. */
    toChatChannel(channel: ServerChannel): Channel {
      const chat = useChatStore();
      const me = chat.user;
      return {
        id: String(channel.id),
        name: channel.name,
        description: channel.isPrivate ? "Private channel" : "Public channel",
        private: channel.isPrivate,
        ownerId: String(channel.ownerId),
        // The page tells "invited" from "joined" by these two lists.
        // The other members are loaded separately when the channel is opened (UC10).
        invitedUserIds: me && channel.state === "invited" ? [me.id] : [],
        members: me && channel.state === "joined" ? [me] : [],
        messages: [],
        lastActivityAt: channel.lastActivityAt
      };
    },

    /**
     * UC2: fetches the user's channels and invitations. Called after login,
     * and again whenever the live connection is re-established, because a
     * channel may have been closed while we were not connected.
     */
    load() {
      this.pending ??= this.fetchList().finally(() => {
        this.pending = null;
      });
      return this.pending;
    },

    async fetchList() {
      const chat = useChatStore();
      const messages = useMessagesStore();
      const userId = chat.user?.id;
      const { data } = await api<{ data: ServerChannel[] }>("/channels");
      // The user logged out (or another one logged in) while the request was running
      if (!userId || chat.user?.id !== userId) return;

      const ids = new Set(data.map(channel => String(channel.id)));
      for (const old of chat.channels)
        if (!ids.has(old.id)) messages.forget(old.id);

      chat.channels = data.map(channel => this.toChatChannel(channel));
      this.loaded = true;
      this.keepSelectionValid();
    },

    /** Selects another joined channel when the selected one is gone. */
    keepSelectionValid() {
      const chat = useChatStore();
      const joined = chat.channels.filter(channel => channel.members.length);
      if (joined.some(channel => channel.id === chat.selectedChannelId)) return;
      const next = joined[0];
      if (next) chat.selectChannel(next.id);
      else chat.selectedChannelId = "";
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
      const chat = useChatStore();
      const channel = this.toChatChannel(data);
      const index = chat.channels.findIndex(item => item.id === channel.id);
      if (index === -1) chat.channels.push(channel);
      else chat.channels[index] = channel;
      chat.selectChannel(channel.id);
      return channel;
    },

    /**
     * UC5: "/cancel" - leave a channel. The server deletes the channel when
     * the admin leaves. Also declines an invitation.
     */
    async leave(channelId: string) {
      await api(`/channels/${channelId}/membership`, { method: "DELETE" });
      this.removeLocal(channelId);
    },

    /** UC4: "/quit" - the admin closes the channel for everyone. */
    async close(channelId: string) {
      await api(`/channels/${channelId}`, { method: "DELETE" });
      this.removeLocal(channelId);
    },

    /** Takes a channel out of the list and forgets its messages. Returns it, if it was there. */
    removeLocal(channelId: string) {
      const chat = useChatStore();
      const channel = chat.channels.find(item => item.id === channelId);
      if (!channel) return null;
      chat.channels = chat.channels.filter(item => item.id !== channelId);
      delete chat.unreadCounts[channelId];
      useMessagesStore().forget(channelId);
      this.keepSelectionValid();
      return channel;
    },

    /**
     * Pushed by the server: a channel stopped existing (closed by its admin,
     * or 30 days without a message).
     */
    onDeleted(channelId: number) {
      // Null when this user closed it themselves: it is already gone from the list
      const channel = this.removeLocal(String(channelId));
      if (channel)
        useChatStore().commandHint = `#${channel.name} no longer exists.`;
    },

    /** Pushed by the server: someone joined or left a channel (UC10). */
    onMembersChanged(channelId: number) {
      const messages = useMessagesStore();
      // Only worth refetching for a channel whose member list is already shown
      if (!(String(channelId) in messages.members)) return;
      void messages.loadMembers(channelId).catch(() => {
        // Not a member any more, or offline: the list is reloaded when the channel is opened
      });
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChannelsStore, import.meta.hot));
}
