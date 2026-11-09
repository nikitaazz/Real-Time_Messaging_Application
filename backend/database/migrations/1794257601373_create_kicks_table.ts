import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Kick votes in public channels (UC4). Each member can kick a given user once;
 * three distinct kicks result in a permanent ban (channel_users.state = 'banned').
 */
export default class extends BaseSchema {
  protected tableName = 'kicks'

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
        .integer('target_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('kicked_by')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()

      table.unique(['channel_id', 'target_id', 'kicked_by'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
