import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('first_name', 50).notNullable()
      table.string('last_name', 50).notNullable()
      table.string('nick_name', 30).notNullable().unique()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()

      // UC9: presence visible to other users
      table.enum('status', ['online', 'dnd', 'offline']).notNullable().defaultTo('online')
      // UC8: notify only for messages that mention this user
      table.boolean('mention_only').notNullable().defaultTo(false)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
