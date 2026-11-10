import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.me': { paramsTuple?: []; params?: {} }
    'channels.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'channels.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'channels.messages.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.members.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'channels.messages.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}