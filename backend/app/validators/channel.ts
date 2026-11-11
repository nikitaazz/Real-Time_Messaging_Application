import vine from '@vinejs/vine'

/** Longest channel name, the size of the channels.name column. */
export const MAX_CHANNEL_NAME_LENGTH = 50

/**
 * UC2, UC4: body of "/join channelName [private]" and of the create dialog.
 *
 * The name is stored in lower case without the leading "#", so "#General" and
 * "general" are the same channel. Only letters, digits, "_" and "-" are allowed,
 * which keeps a name usable as a single word in commands.
 */
export const joinChannelValidator = vine.create({
  name: vine
    .string()
    .parse((value) => (typeof value === 'string' ? value.trim().replace(/^#/, '') : value))
    .minLength(1)
    .maxLength(MAX_CHANNEL_NAME_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/)
    .toLowerCase(),
  /** Only used when the channel doesn't exist yet and is created. */
  isPrivate: vine.boolean().optional(),
})

/**
 * UC4: body of "/invite nickName", "/revoke nickName" and "/kick nickName".
 * A leading "@" is accepted, so "/invite @ed" works like "/invite ed".
 * The same nickname rules as at signup (see validators/user.ts).
 */
export const memberCommandValidator = vine.create({
  nickName: vine
    .string()
    .parse((value) => (typeof value === 'string' ? value.trim().replace(/^@/, '') : value))
    .minLength(2)
    .maxLength(30)
    .regex(/^[A-Za-z0-9_]+$/),
})
