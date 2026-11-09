import { ChannelSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Message from '#models/message'
import Kick from '#models/kick'

export default class Channel extends ChannelSchema {
  /**
   * The creator of the channel is its admin.
   */
  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>

  /**
   * All users related to the channel. Filter by pivot "state"
   * (invited | joined | banned) to get members only.
   */
  @manyToMany(() => User, {
    pivotTable: 'channel_users',
    pivotColumns: ['state', 'invited_by', 'joined_at'],
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>

  @hasMany(() => Kick)
  declare kicks: HasMany<typeof Kick>
}
