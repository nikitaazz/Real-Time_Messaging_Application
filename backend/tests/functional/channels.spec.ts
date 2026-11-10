import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { io, type Socket } from 'socket.io-client'
import env from '#start/env'
import testUtils from '@adonisjs/core/services/test_utils'
import ws from '#services/ws'
import User from '#models/user'
import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'
import Message from '#models/message'

function createUser(nickName: string) {
  return User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName}@example.com`,
    password: 'password123',
  })
}

function addToChannel(
  channel: Channel,
  user: User,
  state: 'invited' | 'joined' | 'banned' = 'joined'
) {
  return ChannelUser.create({
    channelId: channel.id,
    userId: user.id,
    state,
    joinedAt: state === 'joined' ? DateTime.now() : null,
  })
}

/** A channel whose owner has joined it. */
async function createChannel(
  owner: User,
  name: string,
  options: { isPrivate?: boolean; idleDays?: number } = {}
) {
  const channel = await Channel.create({
    name,
    isPrivate: options.isPrivate ?? false,
    ownerId: owner.id,
    lastActivityAt: DateTime.now().minus({ days: options.idleDays ?? 0 }),
  })
  await addToChannel(channel, owner)
  return channel
}

function stateOf(channel: Channel, user: User) {
  return ChannelUser.query()
    .where('channel_id', channel.id)
    .where('user_id', user.id)
    .first()
    .then((row) => row?.state ?? null)
}

test.group('UC2 channel list', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists joined and invited channels, invitations first', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    await createChannel(ed, 'zebra')
    await createChannel(ed, 'alpha')
    const invitedTo = await createChannel(mira, 'secret', { isPrivate: true })
    await addToChannel(invitedTo, ed, 'invited')
    const bannedFrom = await createChannel(mira, 'banned-here')
    await addToChannel(bannedFrom, ed, 'banned')
    await createChannel(mira, 'not-mine')

    const response = await client.get('/api/v1/channels').loginAs(ed)

    response.assertStatus(200)
    const channels: { name: string; state: string }[] = response.body().data
    assert.deepEqual(
      channels.map((channel) => `${channel.name}:${channel.state}`),
      ['secret:invited', 'alpha:joined', 'zebra:joined']
    )
    assert.containsSubset(response.body().data[0], {
      id: invitedTo.id,
      isPrivate: true,
      ownerId: mira.id,
    })
  })

  test('the list requires a login', async ({ client }) => {
    const response = await client.get('/api/v1/channels')
    response.assertStatus(401)
  })

  test('a channel without a message for more than 30 days stops existing', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const old = await createChannel(ed, 'old-news', { idleDays: 31 })
    await createChannel(ed, 'fresh', { idleDays: 29 })

    // Even before it is cleaned up, nobody can write in it any more
    const post = await client
      .post(`/api/v1/channels/${old.id}/messages`)
      .json({ body: 'Anyone here?' })
      .loginAs(ed)
    post.assertStatus(404)

    const list = await client.get('/api/v1/channels').loginAs(ed)
    assert.deepEqual(
      list.body().data.map((channel: { name: string }) => channel.name),
      ['fresh']
    )
    assert.isNull(await Channel.find(old.id))

    // The name is free again: the next /join creates a new channel with a new admin
    const reuse = await client
      .post('/api/v1/channels/join')
      .json({ name: 'old-news' })
      .loginAs(mira)
    reuse.assertStatus(201)
    assert.equal(reuse.body().data.ownerId, mira.id)
    assert.notEqual(reuse.body().data.id, old.id)
  })
})

test.group('UC4 /join', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('joining a name that does not exist creates the channel with the user as admin', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')

    const response = await client
      .post('/api/v1/channels/join')
      .json({ name: '  #Project-X ', isPrivate: true })
      .loginAs(ed)

    response.assertStatus(201)
    assert.containsSubset(response.body().data, {
      name: 'project-x',
      isPrivate: true,
      ownerId: ed.id,
      state: 'joined',
    })

    // The new admin can write in it straight away (UC3)
    const post = await client
      .post(`/api/v1/channels/${response.body().data.id}/messages`)
      .json({ body: 'First!' })
      .loginAs(ed)
    post.assertStatus(201)
  })

  test('anyone can join a public channel; joining twice changes nothing', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')

    const first = await client.post('/api/v1/channels/join').json({ name: 'general' }).loginAs(mira)
    first.assertStatus(200)
    assert.containsSubset(first.body().data, { id: channel.id, ownerId: ed.id, state: 'joined' })

    // isPrivate is ignored for a channel that already exists
    const second = await client
      .post('/api/v1/channels/join')
      .json({ name: 'GENERAL', isPrivate: true })
      .loginAs(mira)
    second.assertStatus(200)

    const rows = await ChannelUser.query().where('channel_id', channel.id).where('user_id', mira.id)
    assert.lengthOf(rows, 1)
    await channel.refresh()
    assert.isFalse(channel.isPrivate)
  })

  test('a private channel needs an invitation', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'secret', { isPrivate: true })

    const refused = await client
      .post('/api/v1/channels/join')
      .json({ name: 'secret' })
      .loginAs(mira)
    refused.assertStatus(403)
    refused.assertBodyContains({ errors: [{ code: 'E_PRIVATE_CHANNEL' }] })
    assert.isNull(await stateOf(channel, mira))

    await addToChannel(channel, mira, 'invited')
    const accepted = await client
      .post('/api/v1/channels/join')
      .json({ name: 'secret' })
      .loginAs(mira)
    accepted.assertStatus(200)
    assert.equal(accepted.body().data.state, 'joined')
    assert.equal(await stateOf(channel, mira), 'joined')
  })

  test('a banned user cannot join again', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, mira, 'banned')

    const response = await client
      .post('/api/v1/channels/join')
      .json({ name: 'general' })
      .loginAs(mira)

    response.assertStatus(403)
    response.assertBodyContains({ errors: [{ code: 'E_BANNED' }] })
    assert.equal(await stateOf(channel, mira), 'banned')
  })

  test('the channel name is checked', async ({ client }) => {
    const ed = await createUser('ed')

    for (const name of ['', '#', 'two words', 'x'.repeat(51), 'smile:)']) {
      const response = await client.post('/api/v1/channels/join').json({ name }).loginAs(ed)
      response.assertStatus(422)
      response.assertBodyContains({ errors: [{ field: 'name' }] })
    }

    const guest = await client.post('/api/v1/channels/join').json({ name: 'general' })
    guest.assertStatus(401)
  })
})

test.group('UC5 /cancel and UC4 /quit', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a member leaves and the channel stays', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, mira)

    const response = await client.delete(`/api/v1/channels/${channel.id}/membership`).loginAs(mira)

    response.assertStatus(204)
    assert.isNull(await stateOf(channel, mira))
    assert.isNotNull(await Channel.find(channel.id))

    // No longer a member: the channel is gone from the list and can't be written in
    const list = await client.get('/api/v1/channels').loginAs(mira)
    assert.lengthOf(list.body().data, 0)
    const post = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Still here?' })
      .loginAs(mira)
    post.assertStatus(403)
  })

  test('when the admin leaves, the channel and its messages are deleted', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, mira)
    await Message.create({ channelId: channel.id, authorId: mira.id, body: 'Hello' })

    const response = await client.delete(`/api/v1/channels/${channel.id}/membership`).loginAs(ed)

    response.assertStatus(204)
    assert.isNull(await Channel.find(channel.id))
    assert.lengthOf(await Message.query().where('channel_id', channel.id), 0)
    assert.isNull(await stateOf(channel, mira))
  })

  test('an invitation can be declined', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'secret', { isPrivate: true })
    await addToChannel(channel, mira, 'invited')

    const response = await client.delete(`/api/v1/channels/${channel.id}/membership`).loginAs(mira)

    response.assertStatus(204)
    assert.isNull(await stateOf(channel, mira))
  })

  test('leaving is refused for outsiders and does not lift a ban', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zahar = await createUser('zahar')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, zahar, 'banned')

    const outsider = await client.delete(`/api/v1/channels/${channel.id}/membership`).loginAs(mira)
    outsider.assertStatus(403)

    const banned = await client.delete(`/api/v1/channels/${channel.id}/membership`).loginAs(zahar)
    banned.assertStatus(403)
    assert.equal(await stateOf(channel, zahar), 'banned')

    const unknown = await client.delete('/api/v1/channels/999999/membership').loginAs(mira)
    unknown.assertStatus(404)
  })

  test('only the admin can close a channel with /quit', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, mira)

    const member = await client.delete(`/api/v1/channels/${channel.id}`).loginAs(mira)
    member.assertStatus(403)
    member.assertBodyContains({ errors: [{ code: 'E_NOT_OWNER' }] })
    assert.isNotNull(await Channel.find(channel.id))

    const admin = await client.delete(`/api/v1/channels/${channel.id}`).loginAs(ed)
    admin.assertStatus(204)
    assert.isNull(await Channel.find(channel.id))

    const again = await client.delete(`/api/v1/channels/${channel.id}`).loginAs(ed)
    again.assertStatus(404)
  })
})

test.group('Live channel updates over WebSocket', (group) => {
  const sockets: Socket[] = []

  /** Connects like the frontend does and resolves once the server has set up the rooms. */
  async function connect(user: User) {
    const token = await User.accessTokens.create(user)
    const socket = io(`http://${env.get('HOST')}:${env.get('PORT')}`, {
      auth: { token: token.value!.release() },
      transports: ['websocket'],
      reconnection: false,
    })
    sockets.push(socket)
    return new Promise<Socket>((resolve, reject) => {
      socket.once('ready', () => resolve(socket))
      socket.once('connect_error', reject)
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

  // Not shut down afterwards: closing Socket.IO also closes the HTTP server the other tests use
  group.setup(() => ws.boot())
  group.each.setup(() => testUtils.db().truncate())
  group.each.teardown(() => {
    for (const socket of sockets.splice(0)) socket.close()
  })

  test('a user who joins gets the live messages of the channel', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    const edSocket = await connect(ed)
    // Connected before joining, so the server has not put this socket in the channel's room
    const miraSocket = await connect(mira)

    const membersChanged = nextEvent<{ channelId: number }>(edSocket, 'channel:members')
    await client.post('/api/v1/channels/join').json({ name: 'general' }).loginAs(mira)
    assert.deepEqual(await membersChanged, { channelId: channel.id })

    const received = nextEvent<{ body: string }>(miraSocket, 'message:new')
    await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Welcome' })
      .loginAs(ed)
    const message = await received
    assert.equal(message?.body, 'Welcome')
  })

  test('a user who leaves stops getting the live messages', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, mira)
    const miraSocket = await connect(mira)

    await client.delete(`/api/v1/channels/${channel.id}/membership`).loginAs(mira)

    const received = nextEvent(miraSocket, 'message:new', 300)
    await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Mira left' })
      .loginAs(ed)
    assert.isNull(await received)
  })

  test('members are told when the channel is closed', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'general')
    await addToChannel(channel, mira)
    const miraSocket = await connect(mira)

    const deleted = nextEvent<{ channelId: number }>(miraSocket, 'channel:deleted')
    await client.delete(`/api/v1/channels/${channel.id}`).loginAs(ed)

    assert.deepEqual(await deleted, { channelId: channel.id })
  })
})
