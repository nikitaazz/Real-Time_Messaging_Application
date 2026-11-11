/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'auth.register': {
    methods: ["POST"],
    pattern: '/api/v1/auth/register',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"register"]],
    types: placeholder as Registry['auth.register']['types'],
  },
  'auth.login': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['auth.login']['types'],
  },
  'auth.logout': {
    methods: ["POST"],
    pattern: '/api/v1/auth/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"logout"]],
    types: placeholder as Registry['auth.logout']['types'],
  },
  'auth.me': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/auth/me',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"me"]],
    types: placeholder as Registry['auth.me']['types'],
  },
  'auth.updateMe': {
    methods: ["PATCH"],
    pattern: '/api/v1/auth/me',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"me"]],
    types: placeholder as Registry['auth.updateMe']['types'],
  },
  'channels.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/channels',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"]],
    types: placeholder as Registry['channels.index']['types'],
  },
  'channels.join': {
    methods: ["POST"],
    pattern: '/api/v1/channels/join',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[0,"join"]],
    types: placeholder as Registry['channels.join']['types'],
  },
  'channels.leave': {
    methods: ["DELETE"],
    pattern: '/api/v1/channels/:id/membership',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"membership"]],
    types: placeholder as Registry['channels.leave']['types'],
  },
  'channels.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/channels/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"]],
    types: placeholder as Registry['channels.destroy']['types'],
  },
  'channels.messages.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/channels/:id/messages',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"messages"]],
    types: placeholder as Registry['channels.messages.index']['types'],
  },
  'channels.messages.store': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/messages',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"messages"]],
    types: placeholder as Registry['channels.messages.store']['types'],
  },
  'channels.members.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/channels/:id/members',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"members"]],
    types: placeholder as Registry['channels.members.index']['types'],
  },
  'channels.members.invite': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/invite',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"invite"]],
    types: placeholder as Registry['channels.members.invite']['types'],
  },
  'channels.members.revoke': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/revoke',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"revoke"]],
    types: placeholder as Registry['channels.members.revoke']['types'],
  },
  'channels.members.kick': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/kick',
    tokens: [[0,"api"],[0,"v1"],[0,"channels"],[1,"id"],[0,"kick"]],
    types: placeholder as Registry['channels.members.kick']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
