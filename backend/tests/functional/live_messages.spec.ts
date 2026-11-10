import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { io, type Socket } from 'socket.io-client'
import env from '#start/env'
import testUtils from '@adonisjs/core/services/test_utils'
import ws from '#services/ws'
import User from '#models/user'
import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'

const serverUrl = () => `http://${env.get('HOST')}:${env.get('PORT')}`

/** A user with an access token, like after logging in. */
async function createUser(nickName: string) {
  const user = await User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName}@example.com`,
    password: 'password123',
  })
  const token = await User.accessTokens.create(user)
  return { user, token: token.value!.release() }
}

function join(channel: Channel, user: User) {
  return ChannelUser.create({
    channelId: channel.id,
    userId: user.id,
    state: 'joined',
    joinedAt: DateTime.now(),
  })
}

/** A channel whose owner has joined it. */
async function createChannel(owner: User, name = 'general') {
  const channel = await Channel.create({
    name,
    isPrivate: false,
    ownerId: owner.id,
    lastActivityAt: DateTime.now(),
  })
  await join(channel, owner)
  return channel
}

/** Connects like the frontend does and resolves once the server has set up the rooms. */
function connect(token?: string) {
  const socket = io(serverUrl(), {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: false,
  })
  return new Promise<Socket>((resolve, reject) => {
    socket.once('ready', () => resolve(socket))
    socket.once('connect_error', (error) => {
      socket.close()
      reject(error)
    })
  })
}

/** Resolves with the next payload of an event, or null when none arrives in time. */
function nextEvent<T>(socket: Socket, event: string, timeoutMs = 500) {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    socket.once(event, (payload: T) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

test.group('Live messages over WebSocket', (group) => {
  const sockets: Socket[] = []

  // Not shut down afterwards: closing Socket.IO also closes the HTTP server the other tests use
  group.setup(() => ws.boot())
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => {
    sockets.splice(0).forEach((socket) => socket.close())
  })

  test('a new message reaches connected members only', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed.user)
    await join(channel, mira.user)

    const miraSocket = await connect(mira.token)
    const zedSocket = await connect(zed.token)
    sockets.push(miraSocket, zedSocket)
    const miraReceives = nextEvent<{ body: string; author: string; mentions: string[] }>(
      miraSocket,
      'message:new'
    )
    const zedReceives = nextEvent(zedSocket, 'message:new')

    const response = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Hi @mira' })
      .loginAs(ed.user)
    response.assertStatus(201)

    const received = await miraReceives
    assert.isNotNull(received)
    assert.containsSubset(received, { body: 'Hi @mira', author: 'ed', mentions: ['mira'] })
    assert.isNull(await zedReceives)
  })

  test('connecting without a valid token is refused', async ({ assert }) => {
    await assert.rejects(() => connect(), 'Unauthorized')
    await assert.rejects(() => connect('oat_invalid.token'), 'Unauthorized')

    // A well-formed token whose id is too big for the database: the lookup itself
    // fails, and the client must not see the database error
    const hugeId = Buffer.from('99999999999999999999').toString('base64url')
    await assert.rejects(() => connect(`oat_${hugeId}.c2VjcmV0`), 'Unauthorized')
  })

  test('a socket can subscribe only to channels the user has joined', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed.user)
    const socket = await connect(mira.token)
    sockets.push(socket)

    assert.isFalse(await socket.emitWithAck('channel:subscribe', channel.id))

    // After joining (which happens over the REST API) the same request is accepted
    await join(channel, mira.user)
    assert.isTrue(await socket.emitWithAck('channel:subscribe', channel.id))

    const received = nextEvent<{ body: string }>(socket, 'message:new')
    await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Welcome' })
      .loginAs(ed.user)
    assert.containsSubset(await received, { body: 'Welcome' })
  })

  test('a channel id that makes no sense is refused without stopping the server', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const socket = await connect(ed.token)
    sockets.push(socket)

    // 3000000000 doesn't fit PostgreSQL's integer type; the others are not ids at all
    for (const channelId of [3_000_000_000, 0, -1, 1.5, '1', null, { id: 1 }]) {
      assert.isFalse(await socket.emitWithAck('channel:subscribe', channelId))
    }

    const response = await client.get('/')
    response.assertStatus(200)
  })

  test('addToChannel and removeFromChannel switch live messages for a user', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed.user)
    const socket = await connect(mira.token)
    sockets.push(socket)
    const post = (body: string) =>
      client.post(`/api/v1/channels/${channel.id}/messages`).json({ body }).loginAs(ed.user)

    // What the channel endpoints call after /join ...
    await join(channel, mira.user)
    ws.addToChannel(mira.user.id, channel.id)
    let received = nextEvent<{ body: string }>(socket, 'message:new')
    await post('first')
    assert.containsSubset(await received, { body: 'first' })

    // ... and after /cancel, /kick or /revoke
    ws.removeFromChannel(mira.user.id, channel.id)
    received = nextEvent<{ body: string }>(socket, 'message:new')
    await post('second')
    assert.isNull(await received)
  })
})
