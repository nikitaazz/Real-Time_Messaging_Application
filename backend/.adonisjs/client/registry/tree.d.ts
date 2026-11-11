/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    register: typeof routes['auth.register']
    login: typeof routes['auth.login']
    logout: typeof routes['auth.logout']
    me: typeof routes['auth.me']
    updateMe: typeof routes['auth.updateMe']
  }
  channels: {
    index: typeof routes['channels.index']
    join: typeof routes['channels.join']
    leave: typeof routes['channels.leave']
    destroy: typeof routes['channels.destroy']
    messages: {
      index: typeof routes['channels.messages.index']
      store: typeof routes['channels.messages.store']
    }
    members: {
      index: typeof routes['channels.members.index']
      invite: typeof routes['channels.members.invite']
      revoke: typeof routes['channels.members.revoke']
      kick: typeof routes['channels.members.kick']
    }
  }
}
