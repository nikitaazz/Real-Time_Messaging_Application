import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Thrown when a user asks for a channel that doesn't exist (404)
 * or that they are not allowed to use (403).
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

  /** UC4: a private channel can only be joined after an invitation from its owner. */
  static privateChannel() {
    return new ChannelAccessException('This channel is private. Ask its owner for an invitation.', {
      status: 403,
      code: 'E_PRIVATE_CHANNEL',
    })
  }

  /** UC4: a permanently kicked user can't come back by joining again. */
  static banned() {
    return new ChannelAccessException('You are banned from this channel', {
      status: 403,
      code: 'E_BANNED',
    })
  }

  /** UC4: /quit is for the admin (the creator of the channel) only. */
  static notOwner() {
    return new ChannelAccessException(
      'Only the channel owner can close it. Use /cancel to leave.',
      { status: 403, code: 'E_NOT_OWNER' }
    )
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).send({
      errors: [{ message: error.message, code: error.code }],
    })
  }
}
