/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    register: typeof routes['auth.register']
    login: typeof routes['auth.login']
    logout: typeof routes['auth.logout']
    me: typeof routes['auth.me']
  }
  channels: {
    messages: {
      index: typeof routes['channels.messages.index']
      store: typeof routes['channels.messages.store']
    }
    members: {
      index: typeof routes['channels.members.index']
    }
  }
}
