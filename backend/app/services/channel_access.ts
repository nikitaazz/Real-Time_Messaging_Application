import Channel from '#models/channel'
import ChannelUser from '#models/channel_user'
import ChannelAccessException from '#exceptions/channel_access_exception'
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
 * @throws ChannelAccessException 404 when the channel doesn't exist, 403 when the user isn't a member
 */
export async function findJoinedChannel(user: User, channelId: number) {
  const channel = await Channel.find(channelId)
  if (!channel) throw ChannelAccessException.notFound()
  if (!(await isMember(user.id, channel.id))) throw ChannelAccessException.notMember()
  return channel
}
