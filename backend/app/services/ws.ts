import { Server, type Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger'
import { Secret } from '@adonisjs/core/helpers'
import User from '#models/user'
import ChannelUser from '#models/channel_user'
import { isMember } from '#services/channel_access'
import { isId } from '#validators/id'

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

    // Runs before a connection is accepted: only logged-in users may connect
    this.io.use(async (socket, next) => {
      try {
        const user = await this.authenticate(socket)
        if (!user) return next(new Error('Unauthorized'))
        socket.data.userId = user.id
        next()
      } catch (error) {
        // The client sees this message, so it must not contain internals such as SQL
        logger.error({ err: error }, 'Socket authentication failed')
        next(new Error('Unauthorized'))
      }
    })

    this.io.on('connection', (socket) => {
      // Listeners first: an event the client sends while the rooms are still
      // being joined below would otherwise be lost
      this.listen(socket)
      void this.joinRooms(socket).catch((error) => {
        logger.error({ err: error }, 'Socket connection setup failed')
        // Dropping the connection makes the client reconnect and try again
        socket.conn.close()
      })
    })
  }

  private async authenticate(socket: Socket) {
    const token: unknown = socket.handshake.auth?.token
    if (typeof token !== 'string') return null
    const accessToken = await User.accessTokens.verify(new Secret(token))
    if (!accessToken) return null
    return User.find(Number(accessToken.tokenableId))
  }

  /**
   * Puts a new socket into the room of its user and of every channel the user has joined.
   */
  private async joinRooms(socket: Socket) {
    const userId: number = socket.data.userId
    await socket.join(userRoom(userId))

    const memberships = await ChannelUser.query()
      .where('user_id', userId)
      .where('state', 'joined')
      .select('channel_id')
    await socket.join(memberships.map((row) => channelRoom(row.channelId)))

    // From now on the client misses nothing. It answers by fetching whatever was
    // posted before this moment (see resync() in the frontend's messages store).
    socket.emit('ready')
  }

  /**
   * Events a client may send.
   *
   * Nothing catches an error thrown inside a listener: it becomes an unhandled
   * promise rejection, which stops the whole Node.js process. So every listener
   * checks what the client sent and catches its own errors.
   */
  private listen(socket: Socket) {
    const userId: number = socket.data.userId

    /**
     * Joins the room of a channel the user became a member of after connecting.
     * The membership is checked, so a socket can't listen to someone else's channel.
     * Answers true or false through the acknowledgement callback.
     */
    socket.on('channel:subscribe', async (channelId: unknown, ack?: unknown) => {
      let subscribed = false
      try {
        if (isId(channelId) && (await isMember(userId, channelId))) {
          await socket.join(channelRoom(channelId))
          subscribed = true
        }
      } catch (error) {
        logger.error({ err: error }, 'channel:subscribe failed')
      }
      if (typeof ack === 'function') ack(subscribed)
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
