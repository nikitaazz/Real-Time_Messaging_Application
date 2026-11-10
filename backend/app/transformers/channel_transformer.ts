import type ChannelUser from '#models/channel_user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A channel as one user sees it in their channel list (UC2): the channel
 * itself plus that user's relation to it. Requires the "channel" relation
 * of the membership row to be preloaded.
 *
 * - state "invited": shown highlighted at the top, not joined yet
 * - state "joined":  a regular member (the admin is the user with id ownerId)
 */
export default class ChannelTransformer extends BaseTransformer<ChannelUser> {
  toObject() {
    const channel = this.resource.channel
    return {
      id: channel.id,
      name: channel.name,
      isPrivate: channel.isPrivate,
      ownerId: channel.ownerId,
      lastActivityAt: channel.lastActivityAt,
      state: this.resource.state as 'invited' | 'joined',
    }
  }
}
