import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'
import Message from '#models/message'

function createUser(nickName: string, status: 'online' | 'dnd' | 'offline' = 'online') {
  return User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName.toLowerCase()}@example.com`,
    password: 'password123',
    status,
  })
}

async function createChannel(owner: User, name = 'general', isPrivate = false) {
  const channel = await Channel.create({
    name,
    isPrivate,
    ownerId: owner.id,
    lastActivityAt: DateTime.now().minus({ days: 1 }),
  })
  await addToChannel(channel, owner)
  return channel
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

test.group('UC3 sending messages', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a member can post and the channel activity is updated', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const channel = await createChannel(ed)
    const before = channel.lastActivityAt

    const response = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: '  Hello everyone  ' })
      .loginAs(ed)

    response.assertStatus(201)
    assert.containsSubset(response.body().data, {
      channelId: channel.id,
      authorId: ed.id,
      author: 'ed',
      body: 'Hello everyone',
      mentions: [],
    })
    await channel.refresh()
    assert.isTrue(channel.lastActivityAt > before)
  })

  test('only members may post', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed)

    const outsider = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Hi' })
      .loginAs(mira)
    outsider.assertStatus(403)
    outsider.assertBodyContains({ errors: [{ code: 'E_NOT_A_MEMBER' }] })

    // An invitation is not membership yet
    await addToChannel(channel, mira, 'invited')
    const invited = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Hi' })
      .loginAs(mira)
    invited.assertStatus(403)

    const saved = await Message.all()
    assert.lengthOf(saved, 0)
  })

  test('unknown channel is 404, empty body is 422, guests are 401', async ({ client }) => {
    const ed = await createUser('ed')
    const channel = await createChannel(ed)

    const missing = await client
      .post('/api/v1/channels/9999/messages')
      .json({ body: 'Hi' })
      .loginAs(ed)
    missing.assertStatus(404)

    const empty = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: '   ' })
      .loginAs(ed)
    empty.assertStatus(422)
    empty.assertBodyContains({ errors: [{ field: 'body' }] })

    const guest = await client.post(`/api/v1/channels/${channel.id}/messages`).json({ body: 'Hi' })
    guest.assertStatus(401)
  })
})

test.group('UC6 mentions', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('@nickname of a member is stored and returned', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('Mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed)
    await addToChannel(channel, mira)

    const response = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      // case-insensitive, repeated, a non-member and an email address
      .json({ body: '@mira look, @MIRA! cc @zed, mail ed@example.com' })
      .loginAs(ed)

    response.assertStatus(201)
    assert.deepEqual(response.body().data.mentions, ['Mira'])

    const message = await Message.findOrFail(response.body().data.id)
    await message.load('mentionedUsers')
    assert.deepEqual(
      message.mentionedUsers.map((user) => user.id),
      [mira.id]
    )
    assert.notInclude(
      message.mentionedUsers.map((user) => user.id),
      zed.id
    )
  })
})

test.group('UC7 history', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('pages go from newest to oldest using the "before" cursor', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const channel = await createChannel(ed)
    const other = await createChannel(ed, 'other')
    for (let index = 1; index <= 25; index++) {
      await Message.create({ channelId: channel.id, authorId: ed.id, body: `message ${index}` })
    }
    await Message.create({ channelId: other.id, authorId: ed.id, body: 'elsewhere' })

    const first = await client.get(`/api/v1/channels/${channel.id}/messages`).loginAs(ed)
    first.assertStatus(200)
    const firstPage = first.body().data as { id: number; body: string }[]
    assert.lengthOf(firstPage, 20)
    assert.equal(firstPage[0]!.body, 'message 25')
    assert.equal(firstPage[19]!.body, 'message 6')

    const second = await client
      .get(`/api/v1/channels/${channel.id}/messages`)
      .qs({ before: firstPage[19]!.id, limit: 20 })
      .loginAs(ed)
    const secondPage = second.body().data as { body: string }[]
    assert.deepEqual(
      secondPage.map((message) => message.body),
      ['message 5', 'message 4', 'message 3', 'message 2', 'message 1']
    )
  })

  test('only members can read history, and the limit is checked', async ({ client }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed)

    const outsider = await client.get(`/api/v1/channels/${channel.id}/messages`).loginAs(mira)
    outsider.assertStatus(403)

    const tooMany = await client
      .get(`/api/v1/channels/${channel.id}/messages`)
      .qs({ limit: 1000 })
      .loginAs(ed)
    tooMany.assertStatus(422)
  })
})

test.group('UC10 /list', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('lists joined members with status, owner first', async ({ client, assert }) => {
    const zed = await createUser('zed')
    const ann = await createUser('ann', 'dnd')
    const bob = await createUser('bob', 'offline')
    const invited = await createUser('invited')
    const banned = await createUser('banned')
    const channel = await createChannel(zed)
    await addToChannel(channel, bob)
    await addToChannel(channel, ann)
    await addToChannel(channel, invited, 'invited')
    await addToChannel(channel, banned, 'banned')

    const response = await client.get(`/api/v1/channels/${channel.id}/members`).loginAs(ann)

    response.assertStatus(200)
    const members = response.body().data as { nickName: string; status: string }[]
    assert.deepEqual(
      members.map((member) => [member.nickName, member.status]),
      [
        ['zed', 'online'],
        ['ann', 'dnd'],
        ['bob', 'offline'],
      ]
    )
    assert.notProperty(members[0], 'email')
  })

  test('non-members cannot see the member list', async ({ client }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'secret', true)

    const response = await client.get(`/api/v1/channels/${channel.id}/members`).loginAs(mira)
    response.assertStatus(403)
  })
})
