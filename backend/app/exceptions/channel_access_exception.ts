import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Thrown when a user asks for a channel that doesn't exist (404)
 * or that they are not a member of (403).
 *
 * The body uses the same { errors: [{ message }] } shape as validation errors,
 * so the frontend can show every API error the same way.
 */
export default class ChannelAccessException extends Exception {
  static notFound() {
    return new ChannelAccessException('Channel not found', {
      status: 404,
      code: 'E_CHANNEL_NOT_FOUND',
    })
  }

  static notMember() {
    return new ChannelAccessException('You are not a member of this channel', {
      status: 403,
      code: 'E_NOT_A_MEMBER',
    })
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).send({
      errors: [{ message: error.message, code: error.code }],
    })
  }
}
