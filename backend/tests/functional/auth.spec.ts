import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

const account = {
  firstName: 'Ed',
  lastName: 'Example',
  nickName: 'ed',
  email: 'ed@example.com',
  password: 'password123',
  passwordConfirmation: 'password123',
}

test.group('UC1 accounts', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('register returns the new user and a token', async ({ client, assert }) => {
    const response = await client.post('/api/v1/auth/register').json(account)

    response.assertStatus(200)
    const { user, token } = response.body().data
    assert.isString(token)
    assert.containsSubset(user, {
      firstName: 'Ed',
      lastName: 'Example',
      nickName: 'ed',
      email: 'ed@example.com',
      status: 'online',
      mentionOnly: false,
    })
    assert.notProperty(user, 'password')
  })

  test('nickname and email must be unique', async ({ client }) => {
    await client.post('/api/v1/auth/register').json(account)

    const sameNick = await client
      .post('/api/v1/auth/register')
      .json({ ...account, email: 'other@example.com' })
    sameNick.assertStatus(422)
    sameNick.assertBodyContains({ errors: [{ field: 'nickName', rule: 'database.unique' }] })

    const sameEmail = await client
      .post('/api/v1/auth/register')
      .json({ ...account, nickName: 'other' })
    sameEmail.assertStatus(422)
    sameEmail.assertBodyContains({ errors: [{ field: 'email', rule: 'database.unique' }] })
  })

  test('nickname may only contain letters, digits and underscores', async ({ client }) => {
    const response = await client
      .post('/api/v1/auth/register')
      .json({ ...account, nickName: 'ed smith' })

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'nickName', rule: 'regex' }] })
  })

  test('login with wrong password is rejected', async ({ client }) => {
    await client.post('/api/v1/auth/register').json(account)

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: account.email, password: 'wrong-password' })

    response.assertStatus(400)
  })

  test('login, read the profile, then logout invalidates the token', async ({ client, assert }) => {
    await client.post('/api/v1/auth/register').json(account)

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: account.email, password: account.password })
    login.assertStatus(200)
    const token: string = login.body().data.token

    const me = await client.get('/api/v1/auth/me').bearerToken(token)
    me.assertStatus(200)
    assert.equal(me.body().data.nickName, 'ed')

    const logout = await client.post('/api/v1/auth/logout').bearerToken(token)
    logout.assertStatus(200)

    const meAfterLogout = await client.get('/api/v1/auth/me').bearerToken(token)
    meAfterLogout.assertStatus(401)
  })

  test('me requires a token', async ({ client }) => {
    const response = await client.get('/api/v1/auth/me')
    response.assertStatus(401)
  })
})
