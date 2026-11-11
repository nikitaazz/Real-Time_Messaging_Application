import { Server, type Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger'
import { Secret } from '@adonisjs/core/helpers'
import User from '#models/user'
import ChannelUser from '#models/channel_user'
import { isMember } from '#services/channel_access'
import { isId } from '#validators/id'
import { MAX_MESSAGE_LENGTH } from '#validators/message'

/** Every socket of a channel's members is in this room, unless the member is offline (UC9). */
export const channelRoom = (channelId: number) => `channel:${channelId}`
/** Every socket (browser tab) of one user is in this room. */
export const userRoom = (userId: number) => `user:${userId}`

/** The rooms of the channels a user has joined. */
async function joinedChannelRooms(userId: number) {
  const memberships = await ChannelUser.query()
    .where('user_id', userId)
    .where('state', 'joined')
    .select('channel_id')
  return memberships.map((row) => channelRoom(row.channelId))
}

/**
 * Real-time transport (Socket.IO on top of WebSocket), sharing the port of the HTTP server.
 * https://socket.io/docs/v4/server-initialization/#with-an-http-server
 *
 * The REST API stays the only way to change data. Sockets push events
 * to the clients that are allowed to see them:
 *
 * To the members of a channel (its room):
 * - "message:new"      a message was posted (UC3)
 * - "channel:members"  someone joined, left or was removed (UC2, UC10)
 * - "channel:deleted"  the channel stopped existing (UC2, UC5)
 * - "user:status"      a member changed their status (UC9)
 * - "typing"           a member is writing; carries the unsent text (UC11)
 *
 * To one user (all their tabs):
 * - "ready"            the socket is set up; the client fetches what it missed
 * - "channel:invited"  the user was invited to a channel (UC2, UC4)
 * - "channel:removed"  the user was removed from a channel by /revoke or /kick (UC4)
 * - "user:updated"     the user changed their own settings in another tab (UC8, UC9)
 *
 * The only thing a client sends that is passed on is "typing": a draft is not
 * data, it is never stored, so it doesn't go through the REST API.
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
        socket.data.nickName = user.nickName
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
   * UC9: an offline user gets no channel events, so their sockets stay out of the channel rooms.
   */
  private async joinRooms(socket: Socket) {
    const userId: number = socket.data.userId
    await socket.join(userRoom(userId))

    const user = await User.find(userId)
    if (user && user.status !== 'offline') {
      await socket.join(await joinedChannelRooms(userId))
    }

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
    const nickName: string = socket.data.nickName

    /**
     * Joins the room of a channel the user became a member of after connecting.
     * The membership is checked, so a socket can't listen to someone else's channel.
     * Answers true or false through the acknowledgement callback.
     */
    socket.on('channel:subscribe', async (channelId: unknown, ack?: unknown) => {
      let subscribed = false
      try {
        if (isId(channelId) && (await this.mayReceive(userId, channelId))) {
          await socket.join(channelRoom(channelId))
          subscribed = true
        }
      } catch (error) {
        logger.error({ err: error }, 'channel:subscribe failed')
      }
      if (typeof ack === 'function') ack(subscribed)
    })

    /**
     * UC11: the user is writing a message. The unsent text is passed on to the
     * other members on every change; an empty text means the user stopped.
     *
     * A socket is in a channel's room only while its user is a member who
     * receives the channel's events, so the room is the permission check and
     * no database query is needed per keystroke.
     */
    socket.on('typing', (event: unknown) => {
      const { channelId, draft } = (event ?? {}) as { channelId?: unknown; draft?: unknown }
      if (!isId(channelId) || typeof draft !== 'string') return
      if (!socket.rooms.has(channelRoom(channelId))) return

      // socket.to() leaves out the sender itself
      socket.to(channelRoom(channelId)).emit('typing', {
        channelId,
        userId,
        nickName,
        draft: draft.slice(0, MAX_MESSAGE_LENGTH),
      })
    })
  }

  /** Whether a channel's events may go to a user: a member who is not offline (UC9). */
  private async mayReceive(userId: number, channelId: number) {
    if (!(await isMember(userId, channelId))) return false
    const user = await User.find(userId)
    return user !== null && user.status !== 'offline'
  }

  /** Sends an event to every member of a channel who is connected and not offline. */
  toChannel(channelId: number, event: string, payload: unknown) {
    this.io?.to(channelRoom(channelId)).emit(event, payload)
  }

  /** Sends an event to every tab of one user. */
  toUser(userId: number, event: string, payload?: unknown) {
    this.io?.to(userRoom(userId)).emit(event, payload)
  }

  /** Stops sending a channel's events to a user, e.g. after /cancel, /kick or /revoke. */
  removeFromChannel(userId: number, channelId: number) {
    this.io?.in(userRoom(userId)).socketsLeave(channelRoom(channelId))
  }

  /** Starts sending a channel's events to all tabs of a user, e.g. after /join. */
  addToChannel(user: User, channelId: number) {
    // UC9: an offline user gets the channel's events only after going online again
    if (user.status === 'offline') return
    this.io?.in(userRoom(user.id)).socketsJoin(channelRoom(channelId))
  }

  /**
   * A channel stopped existing (/quit, the admin's /cancel, or 30 days without
   * a message): tells its connected members, then empties its room.
   */
  closeChannel(channelId: number) {
    this.toChannel(channelId, 'channel:deleted', { channelId })
    this.io?.socketsLeave(channelRoom(channelId))
  }

  /**
   * UC9: a user changed their status (already saved).
   * - The members of the user's channels see the new status at once.
   * - Going offline: the user's tabs stop getting channel events.
   * - Coming back from offline: they get them again, and "ready" makes each
   *   tab fetch what it missed, so the channels update by themselves.
   *
   * @param previous the status before the change
   */
  async statusChanged(user: User, previous: string) {
    if (!this.io) return
    const rooms = await joinedChannelRooms(user.id)
    const ownTabs = this.io.in(userRoom(user.id))

    if (previous === 'offline') ownTabs.socketsJoin(rooms)
    // to([]) would mean "everyone", so a user without channels is skipped
    if (rooms.length > 0) {
      this.io.to(rooms).emit('user:status', { userId: user.id, status: user.status })
    }
    if (user.status === 'offline') ownTabs.socketsLeave(rooms)
    if (previous === 'offline') this.toUser(user.id, 'ready')
  }

  async shutdown() {
    await this.io?.close()
    this.io = null
  }
}

const ws = new Ws()
export default ws
