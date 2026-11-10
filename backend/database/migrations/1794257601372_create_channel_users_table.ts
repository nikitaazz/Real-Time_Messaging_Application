import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Relationship between a user and a channel.
 * - invited: shown highlighted at the top of the channel list (UC2)
 * - joined:  regular member
 * - banned:  permanently kicked, the channel disappears from the user's list (UC4)
 */
export default class extends BaseSchema {
  protected tableName = 'channel_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('channel_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('channels')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('state', ['invited', 'joined', 'banned']).notNullable()
      table
        .integer('invited_by')
        .nullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('joined_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['channel_id', 'user_id'])
      table.index(['user_id', 'state'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
