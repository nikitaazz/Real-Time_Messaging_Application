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

async function createMember(nickName: string, channel?: Channel) {
  const user = await User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName}@example.com`,
    password: 'password123',
  })
  if (channel) {
    await ChannelUser.create({
      channelId: channel.id,
      userId: user.id,
      state: 'joined',
      joinedAt: DateTime.now(),
    })
  }
  const token = await User.accessTokens.create(user)
  return { user, token: token.value!.release() }
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
    const ed = await createMember('ed')
    const channel = await Channel.create({
      name: 'general',
      isPrivate: false,
      ownerId: ed.user.id,
      lastActivityAt: DateTime.now(),
    })
    await ChannelUser.create({
      channelId: channel.id,
      userId: ed.user.id,
      state: 'joined',
      joinedAt: DateTime.now(),
    })
    const mira = await createMember('mira', channel)
    const zed = await createMember('zed')

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
  })

  test('a socket can subscribe only to channels the user has joined', async ({ assert }) => {
    const ed = await createMember('ed')
    const channel = await Channel.create({
      name: 'secret',
      isPrivate: true,
      ownerId: ed.user.id,
      lastActivityAt: DateTime.now(),
    })
    const outsider = await createMember('outsider')
    const socket = await connect(outsider.token)
    sockets.push(socket)

    const allowed = await socket.emitWithAck('channel:subscribe', channel.id)
    assert.isFalse(allowed)
  })
})
