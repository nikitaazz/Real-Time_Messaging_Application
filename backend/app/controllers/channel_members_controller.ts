import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import MemberTransformer from '#transformers/member_transformer'
import { findJoinedChannel } from '#services/channel_access'

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
}
