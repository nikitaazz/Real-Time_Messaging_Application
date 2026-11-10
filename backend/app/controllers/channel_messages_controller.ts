import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import Message from '#models/message'
import MessageTransformer from '#transformers/message_transformer'
import { findJoinedChannel } from '#services/channel_access'
import { findMentionedMembers } from '#services/mentions'
import {
  createMessageValidator,
  DEFAULT_PAGE_SIZE,
  messageHistoryValidator,
} from '#validators/message'

export default class ChannelMessagesController {
  /**
   * UC7: one page of a channel's history, newest first.
   *
   * Cursor pagination: the client passes the id of the oldest message it already
   * has as "before" and gets the next older page. Unlike offset pagination this
   * stays fast for long histories (it uses the (channel_id, id) index) and
   * doesn't skip or repeat messages when new ones arrive while scrolling.
   * A page shorter than "limit" means there is no older history.
   */
  async index({ auth, params, request, serialize }: HttpContext) {
    const channel = await findJoinedChannel(auth.getUserOrFail(), params.id)
    const { before, limit = DEFAULT_PAGE_SIZE } = await request.validateUsing(
      messageHistoryValidator,
      { data: request.qs() }
    )

    const messages = await Message.query()
      .where('channel_id', channel.id)
      .if(before, (query) => query.where('id', '<', before!))
      .preload('author')
      .preload('mentionedUsers')
      .orderBy('id', 'desc')
      .limit(limit)

    return serialize(MessageTransformer.transform(messages))
  }

  /**
   * UC3: post a message to a channel the user has joined.
   * UC6: "@nickname" mentions of channel members are stored with it.
   * Also refreshes the channel's last activity, which drives 30-day expiry (UC2).
   */
  async store({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const channel = await findJoinedChannel(user, params.id)
    const { body } = await request.validateUsing(createMessageValidator)

    // The message, its mentions and the activity timestamp are saved together or not at all
    const message = await db.transaction(async (trx) => {
      const created = await Message.create(
        { channelId: channel.id, authorId: user.id, body },
        { client: trx }
      )

      const mentioned = await findMentionedMembers(channel.id, body, trx)
      if (mentioned.length > 0) {
        await created.related('mentionedUsers').attach(
          mentioned.map((member) => member.id),
          trx
        )
      }

      channel.useTransaction(trx)
      channel.lastActivityAt = DateTime.now()
      await channel.save()

      return created
    })

    await message.load('author')
    await message.load('mentionedUsers')

    response.status(201)
    return serialize(MessageTransformer.transform(message))
  }
}
