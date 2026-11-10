import User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * "@nickname" preceded by the start of the text or by a character that can't
 * be part of a nickname, so "ed@example.com" is not a mention of "example".
 * Nicknames may only contain letters, digits and underscores (see validators/user.ts).
 */
const MENTION_PATTERN = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]+)/g

/**
 * Lowercased, de-duplicated nicknames written as "@nickname" in a message body.
 */
export function parseMentions(body: string) {
  const nicknames = new Set<string>()
  for (const match of body.matchAll(MENTION_PATTERN)) {
    nicknames.add(match[1]!.toLowerCase())
  }
  return [...nicknames]
}

/**
 * UC6: the channel members addressed in a message. A nickname of someone who
 * isn't a member is ignored, since they can't read the channel anyway.
 * Nicknames are compared case-insensitively, the same way the frontend highlights them.
 */
export async function findMentionedMembers(
  channelId: number,
  body: string,
  trx?: TransactionClientContract
) {
  const nicknames = parseMentions(body)
  if (nicknames.length === 0) return []

  return User.query({ client: trx })
    .whereRaw(`LOWER(nick_name) IN (${nicknames.map(() => '?').join(', ')})`, nicknames)
    .whereIn('id', (members) =>
      members
        .from('channel_users')
        .select('user_id')
        .where('channel_id', channelId)
        .where('state', 'joined')
    )
}
