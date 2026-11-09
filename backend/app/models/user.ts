import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Channel from '#models/channel'
import Message from '#models/message'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  /**
   * Channels this user created (and therefore administers).
   */
  @hasMany(() => Channel, { foreignKey: 'ownerId' })
  declare ownedChannels: HasMany<typeof Channel>

  /**
   * Every channel the user is related to. Filter by pivot "state"
   * (invited | joined | banned) to get the channel list.
   */
  @manyToMany(() => Channel, {
    pivotTable: 'channel_users',
    pivotColumns: ['state', 'invited_by', 'joined_at'],
    pivotTimestamps: true,
  })
  declare channels: ManyToMany<typeof Channel>

  @hasMany(() => Message, { foreignKey: 'authorId' })
  declare messages: HasMany<typeof Message>

  get initials() {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase()
  }
}
