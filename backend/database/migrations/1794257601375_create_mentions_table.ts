import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Users addressed with @nickname in a message (UC6, UC8 mention-only notifications).
 */
export default class extends BaseSchema {
  protected tableName = 'mentions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('message_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('messages')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.unique(['message_id', 'user_id'])
      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
