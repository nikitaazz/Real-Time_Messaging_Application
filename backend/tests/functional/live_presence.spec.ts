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
async function createUser(nickName: string, status: 'online' | 'dnd' | 'offline' = 'online') {
  const user = await User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName}@example.com`,
    password: 'password123',
    status,
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
async function createChannel(owner: User, name = 'general', isPrivate = false) {
  const channel = await Channel.create({
    name,
    isPrivate,
    ownerId: owner.id,
    lastActivityAt: DateTime.now(),
  })
  await join(channel, owner)
  return channel
}

/** Connects like the frontend does and resolves once the server has set up the rooms. */
function connect(token: string) {
  const socket = io(serverUrl(), {
    auth: { token },
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

/**
 * Resolves with the next payload of an event, or null when none arrives in time.
 * "ready" has no payload, so it resolves with true.
 */
function nextEvent<T>(socket: Socket, event: string, timeoutMs = 500) {
  return new Promise<T | true | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    socket.once(event, (payload?: T) => {
      clearTimeout(timer)
      resolve(payload ?? true)
    })
  })
}

test.group('Live status, typing and membership over WebSocket', (group) => {
  const sockets: Socket[] = []

  // Not shut down afterwards: closing Socket.IO also closes the HTTP server the other tests use
  group.setup(() => ws.boot())
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => {
    sockets.splice(0).forEach((socket) => socket.close())
  })

  test('UC9: a status change reaches the members of the user’s channels only', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed.user)
    await join(channel, mira.user)

    const edSocket = await connect(ed.token)
    const miraSocket = await connect(mira.token)
    const zedSocket = await connect(zed.token)
    sockets.push(edSocket, miraSocket, zedSocket)
    const miraSees = nextEvent(miraSocket, 'user:status')
    const zedSees = nextEvent(zedSocket, 'user:status')
    // The user's own tabs get the whole changed account
    const ownTab = nextEvent(edSocket, 'user:updated')

    const response = await client.patch('/api/v1/auth/me').json({ status: 'dnd' }).loginAs(ed.user)
    response.assertStatus(200)

    assert.deepEqual(await miraSees, { userId: ed.user.id, status: 'dnd' })
    assert.containsSubset(await ownTab, { id: ed.user.id, status: 'dnd' })
    assert.isNull(await zedSees)
  })

  test('UC9: an offline user gets no messages, and is told to catch up when online again', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed.user)
    await join(channel, mira.user)
    const socket = await connect(mira.token)
    sockets.push(socket)
    const post = (body: string) =>
      client.post(`/api/v1/channels/${channel.id}/messages`).json({ body }).loginAs(ed.user)
    const setStatus = (status: string) =>
      client.patch('/api/v1/auth/me').json({ status }).loginAs(mira.user)

    await setStatus('offline')
    let received = nextEvent<{ body: string }>(socket, 'message:new')
    await post('while offline')
    assert.isNull(await received)

    // "ready" is what makes the frontend fetch the messages it missed
    const ready = nextEvent(socket, 'ready')
    await setStatus('online')
    assert.isTrue(await ready)

    received = nextEvent<{ body: string }>(socket, 'message:new')
    await post('back online')
    assert.containsSubset(await received, { body: 'back online' })
  })

  test('UC9: a user who connects while offline gets no channel events', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira', 'offline')
    const channel = await createChannel(ed.user)
    await join(channel, mira.user)
    const socket = await connect(mira.token)
    sockets.push(socket)

    // Asking for the channel explicitly doesn't get around it
    assert.isFalse(await socket.emitWithAck('channel:subscribe', channel.id))

    const received = nextEvent(socket, 'message:new')
    await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Anyone?' })
      .loginAs(ed.user)
    assert.isNull(await received)
  })

  test('UC9: DND users still get messages (only notifications are off)', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira', 'dnd')
    const channel = await createChannel(ed.user)
    await join(channel, mira.user)
    const socket = await connect(mira.token)
    sockets.push(socket)

    const received = nextEvent<{ body: string }>(socket, 'message:new')
    await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Quietly' })
      .loginAs(ed.user)
    assert.containsSubset(await received, { body: 'Quietly' })
  })

  test('UC11: the text someone is writing goes to the other members as they type', async ({
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed.user)
    await join(channel, mira.user)

    const edSocket = await connect(ed.token)
    const miraSocket = await connect(mira.token)
    const zedSocket = await connect(zed.token)
    sockets.push(edSocket, miraSocket, zedSocket)

    for (const draft of ['H', 'Hel', 'Hello', '']) {
      const miraSees = nextEvent(miraSocket, 'typing')
      const edSees = nextEvent(edSocket, 'typing', 150)
      const zedSees = nextEvent(zedSocket, 'typing', 150)
      edSocket.emit('typing', { channelId: channel.id, draft })

      assert.deepEqual(await miraSees, {
        channelId: channel.id,
        userId: ed.user.id,
        nickName: 'ed',
        draft,
      })
      // Not back to the writer, and not to someone outside the channel
      assert.isNull(await edSees)
      assert.isNull(await zedSees)
    }
  })

  test('UC11: only members can send drafts, and nonsense is ignored', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const zed = await createUser('zed')
    const channel = await createChannel(ed.user)
    const edSocket = await connect(ed.token)
    const zedSocket = await connect(zed.token)
    sockets.push(edSocket, zedSocket)

    const received = nextEvent(edSocket, 'typing', 300)
    zedSocket.emit('typing', { channelId: channel.id, draft: 'I am not a member' })
    for (const event of [null, 'text', 42, {}, { channelId: 'x', draft: 1 }, { channelId: 1 }]) {
      zedSocket.emit('typing', event)
    }
    assert.isNull(await received)

    // The server is still running
    const response = await client.get('/')
    response.assertStatus(200)
  })

  test('UC2, UC4: an invitation reaches the invited user at once', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed.user, 'secret', true)
    const socket = await connect(mira.token)
    sockets.push(socket)
    const invited = nextEvent(socket, 'channel:invited')

    const response = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'mira' })
      .loginAs(ed.user)
    response.assertStatus(200)

    assert.containsSubset(await invited, {
      id: channel.id,
      name: 'secret',
      isPrivate: true,
      ownerId: ed.user.id,
      state: 'invited',
    })
  })

  test('UC4: a banned user is told, gets no more messages, and the members are updated', async ({
    client,
    assert,
  }) => {
    const admin = await createUser('admin')
    const ed = await createUser('ed')
    const troll = await createUser('troll')
    const channel = await createChannel(admin.user, 'lobby')
    await join(channel, ed.user)
    await join(channel, troll.user)
    const edSocket = await connect(ed.token)
    const trollSocket = await connect(troll.token)
    sockets.push(edSocket, trollSocket)
    const removed = nextEvent(trollSocket, 'channel:removed')
    const membersChanged = nextEvent(edSocket, 'channel:members')

    await client
      .post(`/api/v1/channels/${channel.id}/kick`)
      .json({ nickName: 'troll' })
      .loginAs(admin.user)

    assert.deepEqual(await removed, { channelId: channel.id, reason: 'banned' })
    assert.deepEqual(await membersChanged, { channelId: channel.id })

    const received = nextEvent(trollSocket, 'message:new')
    await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Peace at last' })
      .loginAs(admin.user)
    assert.isNull(await received)
  })

  test('UC4: /revoke tells the removed user', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed.user, 'secret', true)
    await join(channel, mira.user)
    const socket = await connect(mira.token)
    sockets.push(socket)
    const removed = nextEvent(socket, 'channel:removed')

    const response = await client
      .post(`/api/v1/channels/${channel.id}/revoke`)
      .json({ nickName: 'mira' })
      .loginAs(ed.user)
    response.assertStatus(204)

    assert.deepEqual(await removed, { channelId: channel.id, reason: 'revoked' })
  })
})
