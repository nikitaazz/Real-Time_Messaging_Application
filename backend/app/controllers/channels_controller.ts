import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'
import type User from '#models/user'
import ChannelTransformer from '#transformers/channel_transformer'
import ChannelAccessException from '#exceptions/channel_access_exception'
import { isExpired, removeExpiredChannels } from '#services/channel_expiry'
import { joinChannelValidator } from '#validators/channel'
import { isId } from '#validators/id'
import ws from '#services/ws'

/** PostgreSQL error code for a violated UNIQUE constraint. */
const UNIQUE_VIOLATION = '23505'

/** Deletes the channels that expired (UC2) and tells their connected members. */
async function cleanUpExpiredChannels() {
  for (const channelId of await removeExpiredChannels()) ws.closeChannel(channelId)
}

/** The channel behind the ":id" route parameter, or a 404. */
async function findChannel(channelId: unknown) {
  const channel = isId(channelId) ? await Channel.find(channelId) : null
  if (!channel || isExpired(channel)) throw ChannelAccessException.notFound()
  return channel
}

function findMembership(channel: Channel, user: User) {
  return ChannelUser.query().where('channel_id', channel.id).where('user_id', user.id).first()
}

/** Tells the connected members that the member list changed, so they reload it (UC10). */
function announceMembersChanged(channelId: number) {
  ws.toChannel(channelId, 'channel:members', { channelId })
}

export default class ChannelsController {
  /**
   * UC2: the channel list of the logged-in user. Only channels the user has
   * joined or is invited to; invitations come first, then by name.
   * Channels the user left or is banned from are not listed.
   */
  async index({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    await cleanUpExpiredChannels()

    const memberships = await ChannelUser.query()
      .where('user_id', user.id)
      .whereIn('state', ['invited', 'joined'])
      .preload('channel')

    memberships.sort(
      (first, second) =>
        Number(second.state === 'invited') - Number(first.state === 'invited') ||
        first.channel.name.localeCompare(second.channel.name)
    )

    return serialize(ChannelTransformer.transform(memberships))
  }

  /**
   * UC4: "/join channelName [private]" and the create dialog.
   * - The channel doesn't exist: it is created and the user becomes its admin (201).
   * - It exists and is public: the user joins it.
   * - It exists and is private: the user joins only if the admin invited them.
   * - The user is banned from it: refused.
   * Accepting an invitation is the same request. Joining twice changes nothing.
   */
  async join({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name, isPrivate = false } = await request.validateUsing(joinChannelValidator)
    await cleanUpExpiredChannels()

    let channel = await Channel.findBy('name', name)
    let membership: ChannelUser | null = null
    let created = false

    if (!channel) {
      try {
        // The channel and its admin's membership are saved together or not at all
        ;[channel, membership] = await db.transaction(async (trx) => {
          const newChannel = await Channel.create(
            { name, isPrivate, ownerId: user.id, lastActivityAt: DateTime.now() },
            { client: trx }
          )
          const ownerMembership = await ChannelUser.create(
            {
              channelId: newChannel.id,
              userId: user.id,
              state: 'joined',
              joinedAt: DateTime.now(),
            },
            { client: trx }
          )
          return [newChannel, ownerMembership] as const
        })
        created = true
      } catch (error) {
        // Someone created a channel with this name at the same moment: join that one
        if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error
        channel = await Channel.findByOrFail('name', name)
      }
    }

    if (!membership) {
      membership = await findMembership(channel, user)

      if (membership?.state === 'banned') throw ChannelAccessException.banned()
      if (!membership && channel.isPrivate) throw ChannelAccessException.privateChannel()

      if (!membership) {
        membership = await ChannelUser.create({
          channelId: channel.id,
          userId: user.id,
          state: 'joined',
          joinedAt: DateTime.now(),
        })
      } else if (membership.state === 'invited') {
        membership.state = 'joined'
        membership.joinedAt = DateTime.now()
        await membership.save()
      }
    }

    // Live messages of this channel now also go to this user (all open tabs)
    ws.addToChannel(user, channel.id)
    if (!created) announceMembersChanged(channel.id)

    await membership.load('channel')
    response.status(created ? 201 : 200)
    return serialize(ChannelTransformer.transform(membership))
  }

  /**
   * UC5: "/cancel" - the user leaves the channel. When the admin leaves, the
   * channel stops existing. Also used to decline an invitation.
   */
  async leave({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findChannel(params.id)
    const membership = await findMembership(channel, user)

    // A banned user keeps the "banned" row, otherwise leaving would lift the ban
    if (!membership || membership.state === 'banned') throw ChannelAccessException.notMember()

    if (channel.ownerId === user.id) {
      await channel.delete()
      ws.closeChannel(channel.id)
    } else {
      await membership.delete()
      ws.removeFromChannel(user.id, channel.id)
      if (membership.state === 'joined') announceMembersChanged(channel.id)
    }

    return response.noContent()
  }

  /**
   * UC4: "/quit" - the admin closes the channel. Its memberships and messages
   * are deleted with it (ON DELETE CASCADE) and the name becomes free again.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findChannel(params.id)

    if (channel.ownerId !== user.id) throw ChannelAccessException.notOwner()

    await channel.delete()
    ws.closeChannel(channel.id)

    return response.noContent()
  }
}
