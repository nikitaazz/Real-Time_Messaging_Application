import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'channels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      // Unique while the channel exists; deleting an expired channel frees the name (UC2)
      table.string('name', 50).notNullable().unique()
      table.boolean('is_private').notNullable().defaultTo(false)
      // The creator is the channel admin (UC2)
      table
        .integer('owner_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      // Time of the last message; channels idle for more than 30 days are removed (UC2)
      table.timestamp('last_activity_at').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['last_activity_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
