import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'
import Kick from '#models/kick'

function createUser(nickName: string) {
  return User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName.toLowerCase()}@example.com`,
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

/** A channel whose owner (admin) has joined it. */
async function createChannel(owner: User, name: string, isPrivate = false) {
  const channel = await Channel.create({
    name,
    isPrivate,
    ownerId: owner.id,
    lastActivityAt: DateTime.now(),
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

function kickVotes(channel: Channel, target: User) {
  return Kick.query().where('channel_id', channel.id).where('target_id', target.id)
}

test.group('UC4 /invite', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the admin invites a user to a private channel, who can then join', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'secret', true)

    const before = await client.post('/api/v1/channels/join').json({ name: 'secret' }).loginAs(mira)
    before.assertStatus(403)

    // A leading "@" and another letter case address the same user
    const invite = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: '@Mira' })
      .loginAs(ed)
    invite.assertStatus(200)
    assert.deepEqual(invite.body().data, { nickName: 'mira', state: 'invited' })
    assert.equal(await stateOf(channel, mira), 'invited')

    // UC2: the invitation is in the invited user's list
    const list = await client.get('/api/v1/channels').loginAs(mira)
    assert.containsSubset(list.body().data, [{ id: channel.id, state: 'invited' }])

    const join = await client.post('/api/v1/channels/join').json({ name: 'secret' }).loginAs(mira)
    join.assertStatus(200)
    assert.equal(await stateOf(channel, mira), 'joined')
  })

  test('only the admin may invite to a private channel', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed, 'secret', true)
    await addToChannel(channel, mira)

    const response = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'zed' })
      .loginAs(mira)

    response.assertStatus(403)
    response.assertBodyContains({ errors: [{ code: 'E_ADMIN_ONLY' }] })
    assert.isNull(await stateOf(channel, zed))
  })

  test('any member may invite to a public channel, a non-member may not', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed, 'lobby')
    await addToChannel(channel, mira)

    const outsider = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'mira' })
      .loginAs(zed)
    outsider.assertStatus(403)
    outsider.assertBodyContains({ errors: [{ code: 'E_NOT_A_MEMBER' }] })

    const member = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'zed' })
      .loginAs(mira)
    member.assertStatus(200)
    assert.equal(await stateOf(channel, zed), 'invited')

    // Inviting again changes nothing
    const again = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'zed' })
      .loginAs(ed)
    again.assertStatus(200)
    assert.lengthOf(await ChannelUser.query().where('user_id', zed.id), 1)
  })

  test('unknown users and existing members are refused', async ({ client }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await createChannel(ed, 'lobby')
    await addToChannel(channel, mira)

    const unknown = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'nobody' })
      .loginAs(ed)
    unknown.assertStatus(404)
    unknown.assertBodyContains({ errors: [{ code: 'E_USER_NOT_FOUND' }] })

    const member = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'mira' })
      .loginAs(ed)
    member.assertStatus(409)
    member.assertBodyContains({ errors: [{ code: 'E_ALREADY_MEMBER' }] })

    const missing = await client.post(`/api/v1/channels/${channel.id}/invite`).json({}).loginAs(ed)
    missing.assertStatus(422)
  })

  test('only the admin can lift a ban by inviting, which also forgets the kicks', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed, 'lobby')
    await addToChannel(channel, mira)
    await addToChannel(channel, zed, 'banned')
    await Kick.create({ channelId: channel.id, targetId: zed.id, kickedBy: ed.id })

    const member = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'zed' })
      .loginAs(mira)
    member.assertStatus(403)
    member.assertBodyContains({ errors: [{ code: 'E_ADMIN_ONLY' }] })
    assert.equal(await stateOf(channel, zed), 'banned')

    const admin = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'zed' })
      .loginAs(ed)
    admin.assertStatus(200)
    assert.equal(await stateOf(channel, zed), 'invited')
    assert.lengthOf(await kickVotes(channel, zed), 0)

    const join = await client.post('/api/v1/channels/join').json({ name: 'lobby' }).loginAs(zed)
    join.assertStatus(200)
  })
})

test.group('UC4 /revoke', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the admin removes a member of a private channel and takes back an invitation', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const channel = await createChannel(ed, 'secret', true)
    await addToChannel(channel, mira)
    await addToChannel(channel, zed, 'invited')

    for (const nickName of ['mira', 'zed']) {
      const response = await client
        .post(`/api/v1/channels/${channel.id}/revoke`)
        .json({ nickName })
        .loginAs(ed)
      response.assertStatus(204)
    }
    assert.isNull(await stateOf(channel, mira))
    assert.isNull(await stateOf(channel, zed))

    // UC2: the channel is gone from the removed user's list and can't be used any more
    const list = await client.get('/api/v1/channels').loginAs(mira)
    assert.lengthOf(list.body().data, 0)
    const post = await client
      .post(`/api/v1/channels/${channel.id}/messages`)
      .json({ body: 'Still here?' })
      .loginAs(mira)
    post.assertStatus(403)

    // Not a ban: the admin can invite the user again
    const invite = await client
      .post(`/api/v1/channels/${channel.id}/invite`)
      .json({ nickName: 'mira' })
      .loginAs(ed)
    invite.assertStatus(200)
  })

  test('only the admin may revoke, and only in a private channel', async ({ client, assert }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const secret = await createChannel(ed, 'secret', true)
    await addToChannel(secret, mira)
    await addToChannel(secret, zed)
    const lobby = await createChannel(ed, 'lobby')
    await addToChannel(lobby, mira)

    const member = await client
      .post(`/api/v1/channels/${secret.id}/revoke`)
      .json({ nickName: 'zed' })
      .loginAs(mira)
    member.assertStatus(403)
    member.assertBodyContains({ errors: [{ code: 'E_ADMIN_ONLY' }] })
    assert.equal(await stateOf(secret, zed), 'joined')

    const inPublic = await client
      .post(`/api/v1/channels/${lobby.id}/revoke`)
      .json({ nickName: 'mira' })
      .loginAs(ed)
    inPublic.assertStatus(403)
    inPublic.assertBodyContains({ errors: [{ code: 'E_NOT_ALLOWED' }] })
    assert.equal(await stateOf(lobby, mira), 'joined')
  })

  test('the admin cannot revoke themselves or someone who is not in the channel', async ({
    client,
  }) => {
    const ed = await createUser('ed')
    await createUser('mira')
    const channel = await createChannel(ed, 'secret', true)

    const self = await client
      .post(`/api/v1/channels/${channel.id}/revoke`)
      .json({ nickName: 'ed' })
      .loginAs(ed)
    self.assertStatus(403)
    self.assertBodyContains({ errors: [{ code: 'E_NOT_ALLOWED' }] })

    const stranger = await client
      .post(`/api/v1/channels/${channel.id}/revoke`)
      .json({ nickName: 'mira' })
      .loginAs(ed)
    stranger.assertStatus(404)
    stranger.assertBodyContains({ errors: [{ code: 'E_NOT_IN_CHANNEL' }] })
  })
})

test.group('UC4 /kick', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('three different members ban a user; the same member counts once', async ({
    client,
    assert,
  }) => {
    const admin = await createUser('admin')
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const zed = await createUser('zed')
    const troll = await createUser('troll')
    const channel = await createChannel(admin, 'lobby')
    for (const member of [ed, mira, zed, troll]) await addToChannel(channel, member)
    const kick = (by: User) =>
      client.post(`/api/v1/channels/${channel.id}/kick`).json({ nickName: 'troll' }).loginAs(by)

    const first = await kick(ed)
    first.assertStatus(200)
    assert.deepEqual(first.body().data, {
      nickName: 'troll',
      banned: false,
      votes: 1,
      votesNeeded: 3,
    })

    // The same member again: still one vote
    const repeated = await kick(ed)
    assert.containsSubset(repeated.body().data, { banned: false, votes: 1 })

    const second = await kick(mira)
    assert.containsSubset(second.body().data, { banned: false, votes: 2 })
    // Until the ban the kicked user stays a member
    assert.equal(await stateOf(channel, troll), 'joined')

    const third = await kick(zed)
    assert.containsSubset(third.body().data, { banned: true, votes: 3 })
    assert.equal(await stateOf(channel, troll), 'banned')

    // UC2: the channel is gone from the banned user's list, and joining again is refused
    const list = await client.get('/api/v1/channels').loginAs(troll)
    assert.lengthOf(list.body().data, 0)
    const rejoin = await client.post('/api/v1/channels/join').json({ name: 'lobby' }).loginAs(troll)
    rejoin.assertStatus(403)
    rejoin.assertBodyContains({ errors: [{ code: 'E_BANNED' }] })
  })

  test('three kicks sent at the same moment still ban the user', async ({ client, assert }) => {
    const admin = await createUser('admin')
    const voters = [await createUser('ed'), await createUser('mira'), await createUser('zed')]
    const troll = await createUser('troll')
    const channel = await createChannel(admin, 'lobby')
    for (const member of [...voters, troll]) await addToChannel(channel, member)

    // Repeated a few times: a race only shows up when the requests really overlap
    for (let round = 0; round < 5; round++) {
      await Kick.query().where('channel_id', channel.id).delete()
      await ChannelUser.query()
        .where('channel_id', channel.id)
        .where('user_id', troll.id)
        .update({ state: 'joined' })

      const responses = await Promise.all(
        voters.map((voter) =>
          client
            .post(`/api/v1/channels/${channel.id}/kick`)
            .json({ nickName: 'troll' })
            .loginAs(voter)
        )
      )

      for (const response of responses) response.assertStatus(200)
      const results: { banned: boolean; votes: number }[] = responses.map(
        (response) => response.body().data
      )
      assert.sameMembers(
        results.map((result) => result.votes),
        [1, 2, 3]
      )
      assert.equal(await stateOf(channel, troll), 'banned')
    }
  })

  test('the admin bans with a single kick', async ({ client, assert }) => {
    const admin = await createUser('admin')
    const troll = await createUser('troll')
    const channel = await createChannel(admin, 'lobby')
    await addToChannel(channel, troll)

    const response = await client
      .post(`/api/v1/channels/${channel.id}/kick`)
      .json({ nickName: 'troll' })
      .loginAs(admin)

    response.assertStatus(200)
    assert.containsSubset(response.body().data, { banned: true, votes: 1 })
    assert.equal(await stateOf(channel, troll), 'banned')
  })

  test('the admin, oneself and non-members cannot be kicked', async ({ client, assert }) => {
    const admin = await createUser('admin')
    const ed = await createUser('ed')
    const outsider = await createUser('outsider')
    const channel = await createChannel(admin, 'lobby')
    await addToChannel(channel, ed)
    const kick = (by: User, nickName: string) =>
      client.post(`/api/v1/channels/${channel.id}/kick`).json({ nickName }).loginAs(by)

    const kickAdmin = await kick(ed, 'admin')
    kickAdmin.assertStatus(403)
    kickAdmin.assertBodyContains({ errors: [{ code: 'E_NOT_ALLOWED' }] })

    const kickSelf = await kick(ed, 'ed')
    kickSelf.assertStatus(403)

    const kickOutsider = await kick(ed, 'outsider')
    kickOutsider.assertStatus(404)
    kickOutsider.assertBodyContains({ errors: [{ code: 'E_NOT_IN_CHANNEL' }] })

    const byOutsider = await kick(outsider, 'ed')
    byOutsider.assertStatus(403)
    byOutsider.assertBodyContains({ errors: [{ code: 'E_NOT_A_MEMBER' }] })

    assert.lengthOf(await Kick.all(), 0)
    assert.equal(await stateOf(channel, ed), 'joined')
  })

  test('/kick does not work in a private channel', async ({ client, assert }) => {
    const admin = await createUser('admin')
    const ed = await createUser('ed')
    const channel = await createChannel(admin, 'secret', true)
    await addToChannel(channel, ed)

    const response = await client
      .post(`/api/v1/channels/${channel.id}/kick`)
      .json({ nickName: 'ed' })
      .loginAs(admin)

    response.assertStatus(403)
    response.assertBodyContains({ errors: [{ code: 'E_NOT_ALLOWED' }] })
    assert.equal(await stateOf(channel, ed), 'joined')
  })
})
