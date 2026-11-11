import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Kick from '#models/kick'
import ChannelUser from '#models/channel_user'
import MemberTransformer from '#transformers/member_transformer'
import ChannelTransformer from '#transformers/channel_transformer'
import ChannelAccessException from '#exceptions/channel_access_exception'
import { findJoinedChannel } from '#services/channel_access'
import { memberCommandValidator } from '#validators/channel'
import ws from '#services/ws'

/** UC4: when this many different members have kicked a user, the user is banned for good. */
export const KICKS_FOR_BAN = 3

/**
 * The user a command is aimed at, or a 404. Nicknames are compared without
 * regard to case, the same way mentions are (see services/mentions.ts).
 */
async function findTarget(nickName: string) {
  const target = await User.query()
    .whereRaw('LOWER(nick_name) = ?', [nickName.toLowerCase()])
    .first()
  if (!target) throw ChannelAccessException.userNotFound(nickName)
  return target
}

function findMembership(channelId: number, userId: number) {
  return ChannelUser.query().where('channel_id', channelId).where('user_id', userId).first()
}

/**
 * Tells everyone concerned that a user is no longer in a channel:
 * the user's own tabs drop the channel from their list (UC2) and stop getting
 * its events, and the remaining members reload the member list (UC10).
 */
function announceRemoval(channelId: number, userId: number, reason: 'revoked' | 'banned') {
  ws.removeFromChannel(userId, channelId)
  ws.toUser(userId, 'channel:removed', { channelId, reason })
  ws.toChannel(channelId, 'channel:members', { channelId })
}

export default class ChannelMembersController {
  /**
   * UC10 (/list): the members of a channel with their status (UC9).
   * Only members may see the list. Invited and banned users are not members.
   * The owner (admin) comes first, then everyone else by nickname.
   */
  async index({ auth, params, serialize }: HttpContext) {
    const channel = await findJoinedChannel(auth.getUserOrFail(), params.id)

    const members = await User.query()
      .join('channel_users', 'channel_users.user_id', 'users.id')
      .where('channel_users.channel_id', channel.id)
      .where('channel_users.state', 'joined')
      .select('users.*')
      .orderByRaw('users.id = ? DESC', [channel.ownerId])
      .orderBy('users.nick_name', 'asc')

    return serialize(MemberTransformer.transform(members))
  }

  /**
   * UC4: "/invite nickName".
   * - Private channel: only the admin may invite.
   * - Public channel: every member may invite.
   * - A banned user: only the admin may invite them, which lifts the ban and
   *   forgets the kicks against them.
   *
   * The invited user sees the channel highlighted at the top of their list (UC2)
   * and becomes a member by joining it (POST /channels/join).
   */
  async invite({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findJoinedChannel(user, params.id)
    const { nickName } = await request.validateUsing(memberCommandValidator)
    const isAdmin = channel.ownerId === user.id

    if (channel.isPrivate && !isAdmin) {
      throw ChannelAccessException.adminOnly(
        'Only the channel admin can invite users to a private channel'
      )
    }

    const target = await findTarget(nickName)
    let membership = await findMembership(channel.id, target.id)

    if (membership?.state === 'joined') throw ChannelAccessException.alreadyMember(target.nickName)
    if (membership?.state === 'banned' && !isAdmin) {
      throw ChannelAccessException.adminOnly(
        `${target.nickName} is banned from this channel. Only the admin can let them back in.`
      )
    }

    if (!membership) {
      membership = await ChannelUser.create({
        channelId: channel.id,
        userId: target.id,
        state: 'invited',
        invitedBy: user.id,
      })
    } else if (membership.state === 'banned') {
      const banned = membership
      // The ban and the kicks that led to it are removed together or not at all
      await db.transaction(async (trx) => {
        await Kick.query({ client: trx })
          .where('channel_id', channel.id)
          .where('target_id', target.id)
          .delete()
        banned.useTransaction(trx)
        banned.state = 'invited'
        banned.invitedBy = user.id
        await banned.save()
      })
    }
    // Already invited: nothing to change, the invitation is only announced again

    await membership.load('channel')
    const invitation = await serialize(ChannelTransformer.transform(membership))
    ws.toUser(target.id, 'channel:invited', invitation.data)

    return serialize({ nickName: target.nickName, state: 'invited' as const })
  }

  /**
   * UC4: "/revoke nickName" - the admin of a private channel removes a member
   * or takes back an invitation. It is not a ban: the user can be invited again.
   */
  async revoke({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findJoinedChannel(user, params.id)
    const { nickName } = await request.validateUsing(memberCommandValidator)

    if (!channel.isPrivate) {
      throw ChannelAccessException.notAllowed(
        '/revoke works in private channels only. In a public channel use /kick.'
      )
    }
    if (channel.ownerId !== user.id) {
      throw ChannelAccessException.adminOnly(
        'Only the channel admin can remove users from a private channel'
      )
    }

    const target = await findTarget(nickName)
    if (target.id === user.id) {
      throw ChannelAccessException.notAllowed(
        'You are the admin of this channel. Use /quit to close it.'
      )
    }

    const membership = await findMembership(channel.id, target.id)
    if (!membership || membership.state === 'banned') {
      throw ChannelAccessException.notInChannel(target.nickName)
    }

    await membership.delete()
    announceRemoval(channel.id, target.id, 'revoked')

    return response.noContent()
  }

  /**
   * UC4: "/kick nickName" in a public channel.
   * - The admin's kick bans the user at once.
   * - A member's kick is one vote. Each member has one vote per user (the
   *   unique key of the "kicks" table); with the third vote the user is banned.
   *
   * A banned user is no longer a member, loses the channel from their list
   * (UC2) and can't join again until the admin invites them.
   * Until the ban, the kicked user stays in the channel.
   */
  async kick({ auth, params, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findJoinedChannel(user, params.id)
    const { nickName } = await request.validateUsing(memberCommandValidator)
    const isAdmin = channel.ownerId === user.id

    if (channel.isPrivate) {
      throw ChannelAccessException.notAllowed(
        '/kick works in public channels only. In a private channel the admin uses /revoke.'
      )
    }

    const target = await findTarget(nickName)
    if (target.id === user.id) {
      throw ChannelAccessException.notAllowed('You cannot kick yourself. Use /cancel to leave.')
    }
    if (target.id === channel.ownerId) {
      throw ChannelAccessException.notAllowed('The channel admin cannot be kicked')
    }

    const membership = await findMembership(channel.id, target.id)
    if (!membership || membership.state !== 'joined') {
      throw ChannelAccessException.notInChannel(target.nickName)
    }

    // The vote and the ban it may cause are saved together or not at all
    const result = await db.transaction(async (trx) => {
      // Kicking the same user twice doesn't add a second vote
      await Kick.firstOrCreate(
        { channelId: channel.id, targetId: target.id, kickedBy: user.id },
        {},
        { client: trx }
      )
      const [{ total }] = await trx
        .from('kicks')
        .where('channel_id', channel.id)
        .where('target_id', target.id)
        .count('* as total')
      const votes = Number(total)
      const banned = isAdmin || votes >= KICKS_FOR_BAN

      if (banned) {
        membership.useTransaction(trx)
        membership.state = 'banned'
        membership.joinedAt = null
        await membership.save()
      }
      return { votes, banned }
    })

    if (result.banned) announceRemoval(channel.id, target.id, 'banned')

    return serialize({
      nickName: target.nickName,
      banned: result.banned,
      votes: result.votes,
      votesNeeded: KICKS_FOR_BAN,
    })
  }
}
