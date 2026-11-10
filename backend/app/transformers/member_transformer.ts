import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * A channel member for /list and the member panel (UC10).
 * Public profile only: no email or settings of other users.
 */
export default class MemberTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['id', 'nickName', 'firstName', 'lastName', 'status'])
  }
}
