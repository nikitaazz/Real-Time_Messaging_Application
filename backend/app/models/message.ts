import { MessageSchema } from '#database/schema'
import { belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Channel from '#models/channel'

export default class Message extends MessageSchema {
  @belongsTo(() => Channel)
  declare channel: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>

  /**
   * Users addressed with @nickname in this message (stored in "mentions").
   */
  @manyToMany(() => User, { pivotTable: 'mentions' })
  declare mentionedUsers: ManyToMany<typeof User>
}
