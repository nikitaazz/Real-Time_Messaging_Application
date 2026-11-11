import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Thrown when a user asks for a channel that doesn't exist (404)
 * or that they are not allowed to use (403), and when a member command
 * (/invite, /revoke, /kick) can't be carried out.
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

  /** UC4: something only the admin of the channel may do, e.g. /revoke. */
  static adminOnly(message: string) {
    return new ChannelAccessException(message, { status: 403, code: 'E_ADMIN_ONLY' })
  }

  /** UC4: the command doesn't apply here, e.g. /kick in a private channel or kicking the admin. */
  static notAllowed(message: string) {
    return new ChannelAccessException(message, { status: 403, code: 'E_NOT_ALLOWED' })
  }

  /** UC4: /invite, /revoke or /kick with a nickname nobody has. */
  static userNotFound(nickName: string) {
    return new ChannelAccessException(`No user has the nickname "${nickName}"`, {
      status: 404,
      code: 'E_USER_NOT_FOUND',
    })
  }

  /** UC4: /revoke or /kick of someone who isn't in the channel. */
  static notInChannel(nickName: string) {
    return new ChannelAccessException(`${nickName} is not in this channel`, {
      status: 404,
      code: 'E_NOT_IN_CHANNEL',
    })
  }

  /** UC4: /invite of someone who has already joined. */
  static alreadyMember(nickName: string) {
    return new ChannelAccessException(`${nickName} is already a member of this channel`, {
      status: 409,
      code: 'E_ALREADY_MEMBER',
    })
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).send({
      errors: [{ message: error.message, code: error.code }],
    })
  }
}
