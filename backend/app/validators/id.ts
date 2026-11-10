/**
 * Largest value of PostgreSQL's "integer" type, which every id column uses
 * (table.increments()).
 */
export const MAX_ID = 2_147_483_647

/**
 * Whether a value sent by a client can be the id of a row.
 *
 * A bigger number can't belong to anything, and PostgreSQL refuses it with
 * "out of range for type integer". Checking first turns that into a normal
 * "not found" answer instead of a server error.
 */
export function isId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_ID
}
