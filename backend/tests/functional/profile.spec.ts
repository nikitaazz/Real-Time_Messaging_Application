import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'

function createUser(nickName: string) {
  return User.create({
    firstName: nickName,
    lastName: 'Test',
    nickName,
    email: `${nickName}@example.com`,
    password: 'password123',
  })
}

test.group('UC8, UC9 own settings', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a user sets their status, and the members of their channels see it', async ({
    client,
    assert,
  }) => {
    const ed = await createUser('ed')
    const mira = await createUser('mira')
    const channel = await Channel.create({
      name: 'general',
      isPrivate: false,
      ownerId: ed.id,
      lastActivityAt: DateTime.now(),
    })
    for (const user of [ed, mira]) {
      await ChannelUser.create({
        channelId: channel.id,
        userId: user.id,
        state: 'joined',
        joinedAt: DateTime.now(),
      })
    }

    const response = await client.patch('/api/v1/auth/me').json({ status: 'dnd' }).loginAs(mira)

    response.assertStatus(200)
    assert.containsSubset(response.body().data, {
      id: mira.id,
      status: 'dnd',
      mentionOnly: false,
    })
    await mira.refresh()
    assert.equal(mira.status, 'dnd')

    const members = await client.get(`/api/v1/channels/${channel.id}/members`).loginAs(ed)
    assert.containsSubset(members.body().data, [
      { nickName: 'ed', status: 'online' },
      { nickName: 'mira', status: 'dnd' },
    ])
  })

  test('only the fields that are sent are changed', async ({ client, assert }) => {
    const ed = await createUser('ed')

    const mentionOnly = await client
      .patch('/api/v1/auth/me')
      .json({ mentionOnly: true })
      .loginAs(ed)
    mentionOnly.assertStatus(200)
    assert.containsSubset(mentionOnly.body().data, { status: 'online', mentionOnly: true })

    const status = await client.patch('/api/v1/auth/me').json({ status: 'offline' }).loginAs(ed)
    assert.containsSubset(status.body().data, { status: 'offline', mentionOnly: true })

    // The settings are part of the account: they come back after logging in again
    const me = await client.get('/api/v1/auth/me').loginAs(ed)
    assert.containsSubset(me.body().data, { status: 'offline', mentionOnly: true })
  })

  test('an unknown status is refused, and a login is required', async ({ client, assert }) => {
    const ed = await createUser('ed')

    const invalid = await client.patch('/api/v1/auth/me').json({ status: 'away' }).loginAs(ed)
    invalid.assertStatus(422)
    invalid.assertBodyContains({ errors: [{ field: 'status' }] })
    await ed.refresh()
    assert.equal(ed.status, 'online')

    const anonymous = await client.patch('/api/v1/auth/me').json({ status: 'dnd' })
    anonymous.assertStatus(401)
  })
})
