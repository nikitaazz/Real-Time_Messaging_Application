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
    .unique({ table: 'users', column: 'nick_name' }),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})
