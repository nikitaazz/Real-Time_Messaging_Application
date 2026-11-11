import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.me': { paramsTuple?: []; params?: {} }
    'auth.updateMe': { paramsTuple?: []; params?: {} }
    'channels.index': { paramsTuple?: []; params?: {} }
    'channels.join': { paramsTuple?: []; params?: {} }
    'channels.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.kick': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'channels.index': { paramsTuple?: []; params?: {} }
    'channels.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'channels.index': { paramsTuple?: []; params?: {} }
    'channels.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'channels.join': { paramsTuple?: []; params?: {} }
    'channels.messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.kick': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'auth.updateMe': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'channels.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}