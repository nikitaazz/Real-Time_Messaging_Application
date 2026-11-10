import { Server, type Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger'
import { Secret } from '@adonisjs/core/helpers'
import User from '#models/user'
import ChannelUser from '#models/channel_user'
import { isMember } from '#services/channel_access'

/** Every socket of a channel's members is in this room. */
export const channelRoom = (channelId: number) => `channel:${channelId}`
/** Every socket (browser tab) of one user is in this room. */
export const userRoom = (userId: number) => `user:${userId}`

/**
 * Real-time transport (Socket.IO on top of WebSocket), sharing the port of the HTTP server.
 * https://socket.io/docs/v4/server-initialization/#with-an-http-server
 *
 * The REST API stays the only way to change data. Sockets only push events
 * to the clients that are allowed to see them:
 * - "message:new" to the members of a channel (UC3)
 *
 * The client authenticates with the same access token it uses for the API.
 */
class Ws {
  io: Server | null = null

  /** Started from start/ws.ts once the HTTP server exists. Not started in tests unless a test calls it. */
  boot() {
    const nodeServer = server.getNodeServer()
    if (this.io || !nodeServer) return

    this.io = new Server(nodeServer, {
      // Same policy as config/cors.ts
      cors: { origin: app.inDev || app.inTest ? true : [] },
    })

    this.io.use(async (socket, next) => {
      try {
        const user = await this.authenticate(socket)
        if (!user) return next(new Error('Unauthorized'))
        socket.data.userId = user.id
        next()
      } catch (error) {
        next(error as Error)
      }
    })

    this.io.on('connection', (socket) => {
      void this.onConnection(socket).catch((error) =>
        logger.error({ err: error }, 'Socket connection setup failed')
      )
    })
  }

  private async authenticate(socket: Socket) {
    const token: unknown = socket.handshake.auth?.token
    if (typeof token !== 'string') return null
    const accessToken = await User.accessTokens.verify(new Secret(token))
    if (!accessToken) return null
    return User.find(Number(accessToken.tokenableId))
  }

  private async onConnection(socket: Socket) {
    const userId: number = socket.data.userId
    await socket.join(userRoom(userId))

    const memberships = await ChannelUser.query()
      .where('user_id', userId)
      .where('state', 'joined')
      .select('channel_id')
    await socket.join(memberships.map((row) => channelRoom(row.channelId)))
    // Tells the client its channel rooms are set up, so no event is missed after this
    socket.emit('ready')

    /**
     * Joins the room of a channel the user became a member of after connecting.
     * The membership is checked, so a socket can't listen to someone else's channel.
     */
    socket.on('channel:subscribe', async (channelId: unknown, ack?: (ok: boolean) => void) => {
      const id = Number(channelId)
      const allowed = Number.isInteger(id) && id > 0 && (await isMember(userId, id))
      if (allowed) await socket.join(channelRoom(id))
      if (typeof ack === 'function') ack(allowed)
    })
  }

  /** Sends an event to every member of a channel who is connected. */
  toChannel(channelId: number, event: string, payload: unknown) {
    this.io?.to(channelRoom(channelId)).emit(event, payload)
  }

  /** Stops sending a channel's events to a user, e.g. after /cancel, /kick or /revoke. */
  removeFromChannel(userId: number, channelId: number) {
    this.io?.in(userRoom(userId)).socketsLeave(channelRoom(channelId))
  }

  /** Starts sending a channel's events to all tabs of a user, e.g. after /join. */
  addToChannel(userId: number, channelId: number) {
    this.io?.in(userRoom(userId)).socketsJoin(channelRoom(channelId))
  }

  async shutdown() {
    await this.io?.close()
    this.io = null
  }
}

const ws = new Ws()
export default ws
