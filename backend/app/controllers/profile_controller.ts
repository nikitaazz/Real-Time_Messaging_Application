import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { updateProfileValidator } from '#validators/user'
import ws from '#services/ws'

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  /**
   * The user changes their own settings:
   * - UC9 status (online, dnd, offline), which the members of their channels see live
   * - UC8 mentionOnly: notifications only for messages addressed to the user
   *
   * Whether a notification is shown is decided in the browser (it depends on
   * whether the app is visible); the server stores the settings so they follow
   * the user to every device.
   */
  async update({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const { status, mentionOnly } = await request.validateUsing(updateProfileValidator)
    const previousStatus = user.status

    if (status !== undefined) user.status = status
    if (mentionOnly !== undefined) user.mentionOnly = mentionOnly
    await user.save()

    const payload = await serialize(UserTransformer.transform(user))
    // The user's other tabs take over the new settings. Sent before "ready"
    // (see statusChanged), so a tab knows it is online again before it catches up.
    ws.toUser(user.id, 'user:updated', payload.data)
    if (user.status !== previousStatus) await ws.statusChanged(user, previousStatus)

    return payload
  }
}
