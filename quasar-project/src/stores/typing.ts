import { acceptHMRUpdate, defineStore } from "pinia";
import { sendTyping, type TypingEvent } from "@/services/socket";
import { useAuthStore } from "@/stores/auth";

/** Someone who is writing a message in a channel, with the text so far. */
export interface Typist {
  userId: number;
  nickName: string;
  draft: string;
}

/**
 * While the user has unsent text, it is sent again this often. That keeps the
 * indicator alive on the other side for as long as the text is there.
 */
const REPEAT_MS = 3000;
/**
 * A typist we heard nothing from for this long is forgotten. It covers every
 * way of stopping without saying so: a closed tab, a lost connection, going
 * offline, being removed from the channel.
 */
const TIMEOUT_MS = 8000;

// Timers are kept outside the state: nothing on screen depends on them
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
let repeat: ReturnType<typeof setInterval> | null = null;

const timeoutKey = (channelId: number, userId: number) =>
  `${channelId}:${userId}`;

/**
 * UC11: who is writing in which channel, and what.
 *
 * The text travels over the WebSocket on every change and is never stored
 * (see the "typing" event in backend/app/services/ws.ts).
 */
export const useTypingStore = defineStore("typing", {
  state: () => ({
    /** The other members who are writing, per channel. */
    typists: {} as Record<number, Typist[]>,
    /** What this user is writing, as the other members were last told. */
    own: null as { channelId: number; draft: string } | null
  }),
  getters: {
    typistsIn: state => (channelId: number) => state.typists[channelId] ?? []
  },
  actions: {
    /** Pushed by the server: a member changed the text they are writing. */
    receive(event: TypingEvent) {
      // This user writing in another tab
      if (event.userId === useAuthStore().user?.id) return;
      if (!event.draft) {
        this.clear(event.channelId, event.userId);
        return;
      }

      const typist: Typist = {
        userId: event.userId,
        nickName: event.nickName,
        draft: event.draft
      };
      const list = this.typistsIn(event.channelId);
      // A typist keeps their place in the list while they write
      this.typists[event.channelId] = list.some(
        item => item.userId === event.userId
      )
        ? list.map(item => (item.userId === event.userId ? typist : item))
        : [...list, typist];

      const key = timeoutKey(event.channelId, event.userId);
      clearTimeout(timeouts.get(key));
      timeouts.set(
        key,
        setTimeout(() => this.clear(event.channelId, event.userId), TIMEOUT_MS)
      );
    },

    /** A member stopped writing: they sent the message, emptied the input, or went silent. */
    clear(channelId: number, userId: number) {
      const key = timeoutKey(channelId, userId);
      clearTimeout(timeouts.get(key));
      timeouts.delete(key);

      const remaining = this.typistsIn(channelId).filter(
        item => item.userId !== userId
      );
      if (remaining.length > 0) this.typists[channelId] = remaining;
      else delete this.typists[channelId];
    },

    /**
     * Called on every change of the command line. Tells the members of the
     * open channel what the user is writing.
     * Commands ("/invite ed") are not shown to anyone: they are not messages.
     */
    setDraft(channelId: number | null, text: string) {
      const draft = text.startsWith("/") ? "" : text;
      const previous = this.own;

      // The text was sent or deleted, or the user moved to another channel
      if (previous && (previous.channelId !== channelId || !draft))
        sendTyping(previous.channelId, "");

      if (channelId === null || !draft) {
        this.own = null;
      } else {
        this.own = { channelId, draft };
        sendTyping(channelId, draft);
      }

      if (this.own && !repeat) {
        repeat = setInterval(() => {
          if (this.own) sendTyping(this.own.channelId, this.own.draft);
        }, REPEAT_MS);
      } else if (!this.own && repeat) {
        clearInterval(repeat);
        repeat = null;
      }
    },

    /** Forgets a channel, e.g. after leaving it. */
    forget(channelId: number) {
      for (const typist of this.typistsIn(channelId))
        this.clear(channelId, typist.userId);
      if (this.own?.channelId === channelId) this.setDraft(null, "");
    },

    /** Stops all timers and empties the store, when the user logs out. */
    stop() {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
      timeouts.clear();
      if (repeat) clearInterval(repeat);
      repeat = null;
      this.$reset();
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTypingStore, import.meta.hot));
}
