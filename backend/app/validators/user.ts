import vine from '@vinejs/vine'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup (UC1).
 * Nicknames are unique and may only contain letters, digits and underscores,
 * so they can be used in "@nickname" mentions and in commands.
 * "Ed" and "ed" count as the same nickname, because mentions and commands
 * don't distinguish upper and lower case.
 */
export const signupValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(50),
  lastName: vine.string().trim().minLength(1).maxLength(50),
  nickName: vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(30)
    .regex(/^[A-Za-z0-9_]+$/)
    .unique({ table: 'users', column: 'nick_name', caseInsensitive: true }),
  email: email().unique({ table: 'users', column: 'email', caseInsensitive: true }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/** UC9: the states a user can set for themselves. */
export const STATUSES = ['online', 'dnd', 'offline'] as const
export type Status = (typeof STATUSES)[number]

/**
 * UC8, UC9: the settings a user can change. Only the fields that are sent are changed.
 * - status:      shown to the other members of the user's channels
 * - mentionOnly: notify only for messages that mention the user
 */
export const updateProfileValidator = vine.create({
  status: vine.enum(STATUSES).optional(),
  mentionOnly: vine.boolean().optional(),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})
