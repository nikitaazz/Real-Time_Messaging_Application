import type Message from '#models/message'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A chat message as the frontend shows it. Requires the "author" and
 * "mentionedUsers" relations to be preloaded.
 *
 * The author and mentions are sent as nicknames, because that is what the
 * message list displays and what UC6 highlighting compares against.
 */
export default class MessageTransformer extends BaseTransformer<Message> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'channelId', 'authorId', 'body', 'createdAt']),
      author: this.resource.author.nickName,
      mentions: this.resource.mentionedUsers.map((user) => user.nickName),
    }
  }
}
