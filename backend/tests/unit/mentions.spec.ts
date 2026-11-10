import { test } from '@japa/runner'
import { parseMentions } from '#services/mentions'

test.group('parseMentions (UC6)', () => {
  test('finds @nickname anywhere in the text', ({ assert }) => {
    assert.deepEqual(parseMentions('@ed are you there?'), ['ed'])
    assert.deepEqual(parseMentions('hi @mira how are you'), ['mira'])
    assert.deepEqual(parseMentions('thanks @zed_1'), ['zed_1'])
  })

  test('punctuation around a mention is not part of the nickname', ({ assert }) => {
    assert.deepEqual(parseMentions('thanks, @mira.'), ['mira'])
    assert.deepEqual(parseMentions('(@mira) @ed, @zed! "@ann"?'), ['mira', 'ed', 'zed', 'ann'])
  })

  test('nicknames are lowercased and listed once', ({ assert }) => {
    assert.deepEqual(parseMentions('@Mira @MIRA @mira'), ['mira'])
  })

  test('an email address is not a mention', ({ assert }) => {
    assert.deepEqual(parseMentions('write to ed@example.com'), [])
    assert.deepEqual(parseMentions('ed@example.com and @mira'), ['mira'])
  })

  test('text without a nickname after "@" has no mentions', ({ assert }) => {
    assert.deepEqual(parseMentions(''), [])
    assert.deepEqual(parseMentions('just text'), [])
    assert.deepEqual(parseMentions('look @ this, 5@'), [])
  })
})
