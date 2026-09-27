import { acceptHMRUpdate, defineStore } from "pinia";

export type Presence = "Online" | "DND" | "Offline";
export interface Member {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  nickName: string;
  status: Presence;
}
export interface ChatMessage {
  id: number;
  author: string;
  body: string;
  time: string;
  mentions?: string[];
}
export interface Notification {
  id: number;
  channelId: string;
  messageId: number;
  recipientId: string;
  reason: "message" | "mention";
  read: boolean;
}
export interface KickRecord {
  userId: string;
  channelId: string;
  kickedBy: string;
  permanent: boolean;
  createdAt: string;
}
export interface Channel {
  id: string;
  name: string;
  description: string;
  private: boolean;
  ownerId: string;
  invitedUserIds: string[];
  members: Member[];
  messages: ChatMessage[];
  lastActivityAt: string;
}

const member = (
  id: string,
  firstName: string,
  lastName: string,
  nickName: string,
  status: Presence
): Member => ({ id, name: nickName, firstName, lastName, nickName, status });
const me = member("me", "Alex", "Morgan", "alex", "Online");
const people = [
  member("n", "Nikita", "Stone", "nikita", "Online"),
  member("z", "Zahar", "Fox", "zahar", "DND"),
  member("m", "Mira", "Lee", "mira", "Offline")
];
const messages = (name: string): ChatMessage[] => [
  { id: 1, author: "nikita", body: `Welcome to #${name}!`, time: "09:41" },
  {
    id: 2,
    author: "zahar",
    body: "Share updates, ask questions, and be kind.",
    time: "09:44"
  },
  {
    id: 3,
    author: "alex",
    body: "Thanks! I am ready to collaborate.",
    time: "09:47",
    mentions: ["alex"]
  }
];
const channel = (
  id: string,
  name: string,
  isPrivate: boolean,
  members: Member[],
  ownerId = "me"
): Channel => ({
  id,
  name,
  private: isPrivate,
  ownerId,
  invitedUserIds: isPrivate ? ["n"] : [],
  members,
  description: isPrivate ? "Private project planning" : "Everyone is welcome",
  messages: messages(name),
  lastActivityAt: new Date().toISOString()
});

export const useChatStore = defineStore("chat", {
  state: () => ({
    user: null as Member | null,
    email: "",
    firstName: "",
    lastName: "",
    nickName: "",
    channels: [
      channel("general", "general", false, [me, ...people], "n"),
      channel("project", "project-alpha", true, [me, people[0]!])
    ] as Channel[],
    selectedChannelId: "general",
    draft: "",
    typing: false,
    typingState: null as {
      nickName: string;
      channelId: string;
      draft: string;
    } | null,
    notifications: true,
    mentionOnly: false,
    notificationState: [] as Notification[],
    unreadCounts: {} as Record<string, number>,
    invitations: [] as string[],
    topUp: 0,
    kickRecords: [] as KickRecord[],
    loadedHistory: 0,
    commandHint: ""
  }),
  getters: {
    selectedChannel: state =>
      state.channels.find(item => item.id === state.selectedChannelId),
    onlineMembers: state =>
      state.channels.find(item => item.id === state.selectedChannelId)
        ?.members ?? []
  },
  actions: {
    startSession(user: Member) {
      this.user = user;
      const invited = channel("updates", "team-updates", true, [people[0]!], "n");
      invited.invitedUserIds.push(user.id);
      this.channels = [
        channel("general", "general", false, [user, ...people], "n"),
        channel("project", "project-alpha", true, [user, people[0]!]),
        invited
      ];
      this.selectedChannelId = "general";
      this.draft = "";
      this.typing = false;
      this.typingState = null;
      this.invitations = [];
      this.kickRecords = [];
      this.notificationState = [];
      this.unreadCounts = {};
      this.notifications = true;
      this.mentionOnly = false;
      this.loadedHistory = 0;
      this.commandHint = "";
    },
    login(email: string, name = "alex") {
      this.email = email;
      this.firstName = name;
      this.lastName = "";
      this.nickName = name;
      this.startSession(member("me", name, "", name, "Online"));
    },
    register(
      email: string,
      firstName: string,
      lastName: string,
      nickName: string
    ) {
      this.email = email;
      this.firstName = firstName;
      this.lastName = lastName;
      this.nickName = nickName;
      this.startSession(member("me", firstName, lastName, nickName, "Online"));
    },
    logout() {
      this.user = null;
      this.draft = "";
      this.typing = false;
      this.typingState = null;
      this.commandHint = "";
    },
    canAccess(item: Channel) {
      const banned = this.kickRecords.some(
        record =>
          record.channelId === item.id &&
          record.userId === this.user?.id &&
          record.permanent
      );
      return (
        !!this.user &&
        !banned &&
        (!item.private ||
          item.members.some(person => person.id === this.user?.id))
      );
    },
    selectChannel(id: string) {
      const item = this.channels.find(channel => channel.id === id);
      if (
        item &&
        this.canAccess(item) &&
        item.members.some(person => person.id === this.user?.id)
      ) {
        this.selectedChannelId = id;
        this.loadedHistory = 0;
        this.unreadCounts[id] = 0;
      }
    },
    createChannel(name: string, isPrivate = false) {
      const clean = name
        .trim()
        .replace(/^#/, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      if (!this.user || !clean || this.channels.some(item => item.name === clean)) {
        this.commandHint = "Choose a unique channel name.";
        return false;
      }
      const created = channel(
        `${clean}-${Date.now()}`,
        clean,
        isPrivate,
        [this.user]
      );
      created.ownerId = this.user.id;
      created.description = isPrivate
        ? "Private conversation"
        : "A new public channel";
      this.channels.push(created);
      this.selectedChannelId = created.id;
      return true;
    },
    leaveChannel(id?: string) {
      const targetId = id ?? this.selectedChannelId;
      const item = this.channels.find(channel => channel.id === targetId);
      if (!item || !this.user || !item.members.some(person => person.id === this.user?.id)) return;
      if (item.ownerId === this.user.id) {
        this.deleteChannel(targetId);
        return;
      }
      item.members = item.members.filter(person => person.id !== this.user?.id);
      if (this.selectedChannelId === targetId)
        this.selectedChannelId = this.channels.find(channel =>
          channel.members.some(person => person.id === this.user?.id)
        )?.id ?? "";
    },
    deleteChannel(id?: string) {
      const targetId = id ?? this.selectedChannelId;
      const item = this.channels.find(channel => channel.id === targetId);
      if (!item || item.ownerId !== this.user?.id) return;
      this.channels = this.channels.filter(channel => channel.id !== targetId);
      if (this.selectedChannelId === targetId)
        this.selectedChannelId = this.channels.find(channel =>
          channel.members.some(person => person.id === this.user?.id)
        )?.id ?? "";
    },
    sendMessage(body: string) {
      const text = body.trim();
      const item = this.selectedChannel;
      if (
        !text ||
        !item ||
        !this.user ||
        !item.members.some(person => person.id === this.user?.id)
      ) return;
      const message: ChatMessage = {
        id: Date.now(),
        author: this.user?.nickName ?? "alex",
        body: text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        mentions:
          text.match(/@[a-z0-9_-]+/gi)?.map(value => value.slice(1)) ?? []
      };
      item.messages.push(message);
      item.lastActivityAt = new Date().toISOString();
      this.notifyMessage(item, message);
      this.draft = "";
      this.typing = false;
      this.typingState = null;
    },
    loadHistory() {
      const item = this.selectedChannel;
      if (!item || !item.members.some(person => person.id === this.user?.id)) return;
      const start = ++this.loadedHistory;
      item.messages.unshift(
        ...Array.from({ length: 3 }, (_, index) => ({
          id: -(start * 10 + index),
          author: index % 2 ? "mira" : "nikita",
          body: `Earlier message ${start * 3 + index + 1} from channel history.`,
          time: "Yesterday"
        }))
      );
    },
    runCommand(input: string) {
      const [command, ...args] = input.trim().split(/\s+/);
      const value = args.join(" ").replace(/^#/, "");
      this.commandHint = "";
      if (command === "/join" && value) {
        const [name, visibility] = value.split(" ");
        const item = this.channels.find(channel => channel.name === name?.toLowerCase());
        if (
          item &&
          (this.canAccess(item) ||
            (item.private &&
              !this.kickRecords.some(record =>
                record.channelId === item.id && record.userId === this.user?.id && record.permanent
              ) &&
              item.invitedUserIds.includes(this.user?.id ?? "")))
        ) {
          if (
            this.user &&
            !item.members.some(person => person.id === this.user?.id)
          )
            item.members.push(this.user);
          item.invitedUserIds = item.invitedUserIds.filter(id => id !== this.user?.id);
          this.selectChannel(item.id);
        } else if (!item && name)
          this.createChannel(name, visibility === "private");
        else this.commandHint = "You cannot join this channel.";
      } else if (command === "/invite") this.invite(value);
      else if (command === "/revoke") this.revoke(value);
      else if (command === "/kick") this.kick(value);
      else if (command === "/quit") {
        if (this.selectedChannel?.ownerId === this.user?.id)
          this.deleteChannel();
        else this.commandHint = "Only the channel owner can close it. Use /cancel to leave.";
      } else if (command === "/cancel") {
        this.leaveChannel();
      } else if (command === "/list") {
        const item = this.selectedChannel;
        this.commandHint = item?.members.some(person => person.id === this.user?.id)
          ? `Members of #${item.name}: ${item.members.map(person => person.nickName).join(", ")}`
          : "Join a channel to see its members.";
      } else this.commandHint = "Unknown command or missing channel name.";
    },
    invite(nick: string) {
      const item = this.selectedChannel;
      const target = people.find(person => person.nickName === nick);
      const isMember = item?.members.some(
        person => person.id === this.user?.id
      );
      const allowed =
        !!item &&
        !!target &&
        (item.private ? item.ownerId === this.user?.id : Boolean(isMember));
      if (allowed && item && target) {
        const banned = this.kickRecords.some(record =>
          record.channelId === item.id && record.userId === target.id && record.permanent
        );
        if (banned && item.ownerId !== this.user?.id) {
          this.commandHint = "Only the channel owner can restore a banned member.";
          return;
        }
        if (!item.private && item.ownerId === this.user?.id)
          this.kickRecords = this.kickRecords.filter(
            record => record.channelId !== item.id || record.userId !== target.id
          );
        if (!item.invitedUserIds.includes(target.id))
          item.invitedUserIds.push(target.id);
        this.invitations.push(`${target.nickName}:${item.id}`);
      }
    },
    revoke(nick: string) {
      const item = this.selectedChannel;
      const target = item?.members.find(person => person.nickName === nick) ??
        people.find(person => person.nickName === nick);
      const allowed =
        !!item &&
        item.private &&
        item.ownerId === this.user?.id;
      if (allowed && item && target && target.id !== this.user?.id) {
        item.invitedUserIds = item.invitedUserIds.filter(
          id => id !== target.id
        );
        item.members = item.members.filter(person => person.id !== target.id);
      }
    },
    declineInvitation(id: string) {
      const item = this.channels.find(channel => channel.id === id);
      if (item && this.user)
        item.invitedUserIds = item.invitedUserIds.filter(userId => userId !== this.user?.id);
    },
    kick(nick: string) {
      const item = this.selectedChannel;
      const target = item?.members.find(person => person.nickName === nick);
      const actor = this.user;
      const isMember = item?.members.some(person => person.id === actor?.id);
      const allowed =
        !!item &&
        !!target &&
        !!actor &&
        !item.private &&
        target.id !== actor.id &&
        Boolean(isMember);
      if (allowed && item && target && actor) {
        const previousActors = new Set(
          this.kickRecords
            .filter(
              record =>
                record.channelId === item.id && record.userId === target.id
            )
            .map(record => record.kickedBy)
        );
        previousActors.add(actor.id);
        const permanent = item.ownerId === actor.id || previousActors.size >= 3;
        item.members = item.members.filter(person => person.id !== target.id);
        item.invitedUserIds = item.invitedUserIds.filter(id => id !== target.id);
        this.kickRecords.push({
          userId: target.id,
          channelId: item.id,
          kickedBy: actor.id,
          permanent,
          createdAt: new Date().toISOString()
        });
      }
    },
    notifyMessage(item: Channel, message: ChatMessage) {
      if (
        !this.notifications ||
        !this.user ||
        this.user.status !== "Online" ||
        message.author === this.user.nickName ||
        (this.mentionOnly &&
          !message.mentions?.some(
            name => name.toLowerCase() === this.user?.nickName.toLowerCase()
          )) ||
        (item.private &&
          !item.members.some(person => person.id === this.user?.id))
      )
        return;
      this.notificationState.push({
        id: Date.now(),
        channelId: item.id,
        messageId: message.id,
        recipientId: this.user.id,
        reason: message.mentions?.length ? "mention" : "message",
        read: false
      });
      this.unreadCounts[item.id] = (this.unreadCounts[item.id] ?? 0) + 1;
    },
    setTyping(draft: string) {
      this.draft = draft;
      this.typing = Boolean(draft);
      this.typingState = draft
        ? { nickName: this.user?.nickName ?? "", channelId: this.selectedChannelId, draft }
        : null;
    },
    setPresence(status: Presence) {
      if (this.user) this.user.status = status;
    }
  }
});
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot));
