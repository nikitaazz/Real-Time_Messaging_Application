import { DateTime } from 'luxon'
import Channel from '#models/channel'

/** UC2: a channel without a new message for longer than this stops existing. */
export const CHANNEL_LIFETIME_DAYS = 30

const expiryLimit = () => DateTime.now().minus({ days: CHANNEL_LIFETIME_DAYS })

/** Whether the channel's last message (or its creation) is more than 30 days ago. */
export function isExpired(channel: Channel) {
  return channel.lastActivityAt < expiryLimit()
}

/**
 * UC2: deletes the channels nobody wrote in for more than 30 days, which makes
 * their names available again. Memberships, messages and kicks go with them
 * (ON DELETE CASCADE in the migrations).
 *
 * Called before the channel list is read and before a channel is joined or
 * created, so an expired channel is never shown and never blocks its name.
 * That is enough for this app; no background job is needed.
 *
 * @returns the ids of the removed channels, so their members can be told
 */
export async function removeExpiredChannels() {
  const expired = await Channel.query()
    .where('last_activity_at', '<', expiryLimit().toSQL()!)
    .select('id')
  if (expired.length === 0) return []

  const ids = expired.map((channel) => channel.id)
  await Channel.query().whereIn('id', ids).delete()
  return ids
}
