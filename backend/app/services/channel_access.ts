import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'
import ChannelAccessException from '#exceptions/channel_access_exception'
import { isExpired } from '#services/channel_expiry'
import { isId } from '#validators/id'
import type User from '#models/user'

/**
 * Whether the user has joined the channel. Invited and banned users are not members.
 */
export async function isMember(userId: number, channelId: number) {
  const row = await ChannelUser.query()
    .where('channel_id', channelId)
    .where('user_id', userId)
    .where('state', 'joined')
    .first()
  return row !== null
}

/**
 * Loads a channel the user has joined. Used by every endpoint that only
 * members may call: sending messages (UC3), history (UC7) and /list (UC10).
 *
 * @param channelId the ":id" route parameter, as sent by the client
 * @throws ChannelAccessException 404 when the channel doesn't exist, 403 when the user isn't a member
 */
export async function findJoinedChannel(user: User, channelId: unknown) {
  const channel = isId(channelId) ? await Channel.find(channelId) : null
  // A channel idle for more than 30 days no longer exists (UC2), even before it is cleaned up
  if (!channel || isExpired(channel)) throw ChannelAccessException.notFound()
  if (!(await isMember(user.id, channel.id))) throw ChannelAccessException.notMember()
  return channel
}
