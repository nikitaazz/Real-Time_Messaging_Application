/**
 * "@nickname" that is not part of a longer word, so "ed@example.com" is not a
 * mention. Nicknames contain only letters, digits and underscores.
 * The same rule as on the backend (backend/app/services/mentions.ts).
 */
const MENTION_PATTERN = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]+)/g;

/** A piece of a message body: plain text, or an "@nickname" to highlight. */
export interface MessagePart {
  text: string;
  mention: boolean;
}

/**
 * UC6: splits a message body into plain text and highlighted "@nickname" parts.
 *
 * Only the nicknames in "mentions" are highlighted. That list comes with the
 * message: the server decides who was mentioned (channel members at the time
 * it was sent), so "@someone" who is not in the channel stays plain text.
 *
 * Returning parts instead of HTML lets the template render them as text,
 * so nothing a user types is ever interpreted as markup.
 */
export function splitMentions(body: string, mentions: readonly string[]) {
  const mentioned = new Set(mentions.map(name => name.toLowerCase()));
  const parts: MessagePart[] = [];
  let plainStart = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const before = match[1] ?? "";
    const nickname = match[2] ?? "";
    if (!mentioned.has(nickname.toLowerCase())) continue;

    // The match starts at the character before "@" (if any); the mention starts at "@"
    const start = match.index + before.length;
    const end = start + 1 + nickname.length;
    if (start > plainStart)
      parts.push({ text: body.slice(plainStart, start), mention: false });
    parts.push({ text: body.slice(start, end), mention: true });
    plainStart = end;
  }

  if (plainStart < body.length)
    parts.push({ text: body.slice(plainStart), mention: false });
  return parts;
}
