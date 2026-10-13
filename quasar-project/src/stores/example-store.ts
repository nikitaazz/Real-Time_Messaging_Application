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
export interface NotificationRecord {
  id: number;
  channelId: string;
  messageId: number;
  recipientId: string;
  reason: "message" | "mention";
  read: boolean;
}
export interface InAppNotification {
  title: string;
  body: string;
  channelId: string;
}
export interface PendingMessage {
  channelId: string;
  author: string;
  body: string;
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
    notificationState: [] as NotificationRecord[],
    lastNotificationStatus: "",
    inAppNotification: null as InAppNotification | null,
    testMessageQueued: false,
    pendingMessages: [] as PendingMessage[],
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
      const invited = channel(
        "updates",
        "team-updates",
        true,
        [people[0]!],
        "n"
      );
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
      this.lastNotificationStatus = "";
      this.inAppNotification = null;
      this.testMessageQueued = false;
      this.pendingMessages = [];
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
      this.inAppNotification = null;
      this.testMessageQueued = false;
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
      if (
        !this.user ||
        !clean ||
        this.channels.some(item => item.name === clean)
      ) {
        this.commandHint = "Choose a unique channel name.";
        return false;
      }
      const created = channel(`${clean}-${Date.now()}`, clean, isPrivate, [
        this.user
      ]);
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
      if (
        !item ||
        !this.user ||
        !item.members.some(person => person.id === this.user?.id)
      )
        return;
      if (item.ownerId === this.user.id) {
        this.deleteChannel(targetId);
        return;
      }
      item.members = item.members.filter(person => person.id !== this.user?.id);
      if (this.selectedChannelId === targetId)
        this.selectedChannelId =
          this.channels.find(channel =>
            channel.members.some(person => person.id === this.user?.id)
          )?.id ?? "";
    },
    deleteChannel(id?: string) {
      const targetId = id ?? this.selectedChannelId;
      const item = this.channels.find(channel => channel.id === targetId);
      if (!item || item.ownerId !== this.user?.id) return;
      this.channels = this.channels.filter(channel => channel.id !== targetId);
      if (this.selectedChannelId === targetId)
        this.selectedChannelId =
          this.channels.find(channel =>
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
      )
        return;
      const message: ChatMessage = {
        id: Date.now(),
        author: this.user?.nickName ?? "alex",
        body: text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        mentions: this.extractMemberMentions(text, item)
      };
      item.messages.push(message);
      item.lastActivityAt = new Date().toISOString();
      this.draft = "";
      this.typing = false;
      this.typingState = null;
    },
    receiveMessage(channelId: string, author: string, body: string) {
      const item = this.channels.find(channel => channel.id === channelId);
      if (
        !item ||
        !body.trim() ||
        !this.user ||
        !item.members.some(person => person.id === this.user?.id)
      )
        return;
      if (this.user?.status === "Offline") {
        this.pendingMessages.push({ channelId, author, body });
        return;
      }
      const message: ChatMessage = {
        id: Date.now(),
        author,
        body: body.trim(),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        mentions: this.extractMemberMentions(body, item)
      };
      item.messages.push(message);
      item.lastActivityAt = new Date().toISOString();
      this.notifyMessage(item, message);
      if (this.selectedChannelId !== item.id)
        this.unreadCounts[item.id] = (this.unreadCounts[item.id] ?? 0) + 1;
    },
    receiveTestMessage(channelId?: string) {
      const targetId = channelId ?? this.selectedChannelId;
      const item = this.channels.find(channel => channel.id === targetId);
      if (
        !item ||
        !this.user ||
        !item.members.some(person => person.id === this.user?.id)
      )
        return false;
      const author = this.user.nickName === "nikita" ? "alex" : "nikita";
      const body = this.mentionOnly
        ? `@${this.user.nickName} This is a BeBe notification test.`
        : "This is a BeBe notification test.";
      this.receiveMessage(item.id, author, body);
      return true;
    },
    scheduleTestMessage() {
      const item = this.selectedChannel;
      const recipient = this.user;
      if (!item || !recipient || recipient.status !== "Online" || this.testMessageQueued)
        return false;
      this.testMessageQueued = true;
      setTimeout(() => {
        if (this.user !== recipient) return;
        this.testMessageQueued = false;
        this.receiveTestMessage(item.id);
      }, 5000);
      return true;
    },
    loadHistory() {
      const item = this.selectedChannel;
      if (!item || !item.members.some(person => person.id === this.user?.id))
        return;
      const batch = this.loadedHistory++;
      const firstMessageNumber = (batch + 1) * 3;
      item.messages.unshift(
        ...Array.from({ length: 3 }, (_, index) => {
          const messageNumber = firstMessageNumber - index;
          return {
            id: -(batch * 3 + index + 1),
            author: index % 2 ? "mira" : "nikita",
            body: `Earlier message ${messageNumber} from channel history.`,
            time: "Yesterday"
          };
        })
      );
    },
    extractMemberMentions(text: string, item: Channel) {
      const mentions: string[] = [];
      const mentionPattern =
        /(^|[^a-z0-9._%+-])@([a-z0-9_-]+)(?![a-z0-9_.-])/gi;
      for (const match of text.matchAll(mentionPattern)) {
        const nickname = match[2];
        if (
          nickname &&
          item.members.some(
            person => person.nickName.toLowerCase() === nickname.toLowerCase()
          ) &&
          !mentions.some(name => name.toLowerCase() === nickname.toLowerCase())
        )
          mentions.push(nickname);
      }
      return mentions;
    },
    runCommand(input: string) {
      const [command, ...args] = input.trim().split(/\s+/);
      const value = args.join(" ").replace(/^#/, "");
      this.commandHint = "";
      if (command === "/join" && value) {
        const [name, visibility] = value.split(" ");
        const item = this.channels.find(
          channel => channel.name === name?.toLowerCase()
        );
        if (
          item &&
          (this.canAccess(item) ||
            (item.private &&
              !this.kickRecords.some(
                record =>
                  record.channelId === item.id &&
                  record.userId === this.user?.id &&
                  record.permanent
              ) &&
              item.invitedUserIds.includes(this.user?.id ?? "")))
        ) {
          if (
            this.user &&
            !item.members.some(person => person.id === this.user?.id)
          )
            item.members.push(this.user);
          item.invitedUserIds = item.invitedUserIds.filter(
            id => id !== this.user?.id
          );
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
        else
          this.commandHint =
            "Only the channel owner can close it. Use /cancel to leave.";
      } else if (command === "/cancel") {
        this.leaveChannel();
      } else if (command === "/list") {
        const item = this.selectedChannel;
        this.commandHint = item?.members.some(
          person => person.id === this.user?.id
        )
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
        const banned = this.kickRecords.some(
          record =>
            record.channelId === item.id &&
            record.userId === target.id &&
            record.permanent
        );
        if (banned && item.ownerId !== this.user?.id) {
          this.commandHint =
            "Only the channel owner can restore a banned member.";
          return;
        }
        if (!item.private && item.ownerId === this.user?.id)
          this.kickRecords = this.kickRecords.filter(
            record =>
              record.channelId !== item.id || record.userId !== target.id
          );
        if (!item.invitedUserIds.includes(target.id))
          item.invitedUserIds.push(target.id);
        this.invitations.push(`${target.nickName}:${item.id}`);
      }
    },
    revoke(nick: string) {
      const item = this.selectedChannel;
      const target =
        item?.members.find(person => person.nickName === nick) ??
        people.find(person => person.nickName === nick);
      const allowed = !!item && item.private && item.ownerId === this.user?.id;
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
        item.invitedUserIds = item.invitedUserIds.filter(
          userId => userId !== this.user?.id
        );
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
        item.invitedUserIds = item.invitedUserIds.filter(
          id => id !== target.id
        );
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
      this.lastNotificationStatus = "";
      if (
        !this.user ||
        message.author === this.user.nickName ||
        !item.members.some(person => person.id === this.user?.id)
      )
        return;
      if (!this.notifications) {
        this.lastNotificationStatus =
          "Notifications are turned off in BeBe settings.";
        return;
      }
      if (this.user.status !== "Online") {
        this.lastNotificationStatus =
          this.user.status === "DND"
            ? "No notification: your status is DND."
            : "No notification: your status is Offline.";
        return;
      }
      if (
        this.mentionOnly &&
        !message.mentions?.some(
          name => name.toLowerCase() === this.user?.nickName.toLowerCase()
        )
      ) {
        this.lastNotificationStatus =
          "No notification: this message did not mention your nickname.";
        return;
      }
      const notificationRecord: NotificationRecord = {
        id: Date.now(),
        channelId: item.id,
        messageId: message.id,
        recipientId: this.user.id,
        reason: message.mentions?.length ? "mention" : "message",
        read: false
      };
      this.notificationState.push(notificationRecord);
      this.inAppNotification = {
        title: `#${item.name} · ${message.author}`,
        body: message.body,
        channelId: item.id
      };
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        this.lastNotificationStatus = "Showing an in-app notification.";
        return;
      }
      if (document.visibilityState !== "hidden") {
        this.lastNotificationStatus =
          "No notification: the app is not currently visible or hidden.";
        return;
      }
      if (typeof Notification === "undefined") {
        this.lastNotificationStatus =
          "No notification: this browser does not support desktop notifications.";
        return;
      }
      if (Notification.permission !== "granted") {
        this.lastNotificationStatus = `No notification: browser permission is ${Notification.permission}.`;
        return;
      }
      const title = `#${item.name}`;
      const options: NotificationOptions = {
        body: `${message.author}: ${message.body.slice(0, 120)}`,
        tag: `bebe-${item.id}-${message.id}`,
        data: { channelId: item.id }
      };
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        void navigator.serviceWorker.ready
          .then(registration => registration.showNotification(title, options))
          .then(() => {
            this.lastNotificationStatus = "Browser notification was sent.";
          })
          .catch(error => {
            this.lastNotificationStatus =
              "The service worker failed to show the notification.";
            console.error(
              "BeBe could not display the browser notification.",
              error
            );
          });
        return;
      }
      try {
        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          this.selectChannel(item.id);
          notification.close();
        };
        this.lastNotificationStatus = "Browser notification was sent.";
      } catch (error) {
        this.lastNotificationStatus =
          "The browser rejected the notification request.";
        console.error(
          "BeBe could not display the browser notification.",
          error
        );
      }
    },
    dismissInAppNotification() {
      this.inAppNotification = null;
    },
    setTyping(draft: string) {
      this.draft = draft;
      this.typing = Boolean(draft);
      this.typingState = draft
        ? {
            nickName: this.user?.nickName ?? "",
            channelId: this.selectedChannelId,
            draft
          }
        : null;
    },
    setPresence(status: Presence) {
      if (!this.user) return;
      this.user.status = status;
      if (status === "Online") {
        const pending = this.pendingMessages.splice(0);
        pending.forEach(message =>
          this.receiveMessage(message.channelId, message.author, message.body)
        );
      }
    }
  }
});
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot));
