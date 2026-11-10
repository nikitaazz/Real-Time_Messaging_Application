import { test } from '@japa/runner'
import { isId, MAX_ID } from '#validators/id'

test.group('isId', () => {
  test('accepts whole numbers that a PostgreSQL integer id can have', ({ assert }) => {
    assert.isTrue(isId(1))
    assert.isTrue(isId(MAX_ID))
  })

  test('rejects everything else', ({ assert }) => {
    for (const value of [0, -1, 1.5, MAX_ID + 1, 1e20, Number.NaN, '1', null, undefined, {}]) {
      assert.isFalse(isId(value), `isId(${String(value)})`)
    }
  })
})
