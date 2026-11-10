import vine from '@vinejs/vine'
import { MAX_ID } from '#validators/id'

/** Longest message the command line accepts. */
export const MAX_MESSAGE_LENGTH = 2000

/** Default and largest page size for message history (UC7). */
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

/**
 * UC3: the body of a new message. Commands (/join, /list, ...) never reach
 * this endpoint; the frontend handles them before sending.
 */
export const createMessageValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(MAX_MESSAGE_LENGTH),
})

/**
 * UC7: query string for one page of history.
 * - before: id of the oldest message the client already has (cursor). Omit for the newest page.
 * - limit:  page size
 */
export const messageHistoryValidator = vine.create({
  before: vine.number().withoutDecimals().range([1, MAX_ID]).optional(),
  limit: vine.number().withoutDecimals().range([1, MAX_PAGE_SIZE]).optional(),
})
