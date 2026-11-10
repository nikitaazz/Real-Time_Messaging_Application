/*
|--------------------------------------------------------------------------
| WebSocket server
|--------------------------------------------------------------------------
|
| Starts Socket.IO on the same port as the HTTP server, once it is ready.
| See app/services/ws.ts.
|
*/

import app from '@adonisjs/core/services/app'
import ws from '#services/ws'

app.ready(() => ws.boot())
app.terminating(() => ws.shutdown())
