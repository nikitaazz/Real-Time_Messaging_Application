/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    /**
     * UC1: accounts. All responses are wrapped in { data: ... }.
     */
    router
      .group(() => {
        router.post('register', [controllers.NewAccount, 'store']).as('register')
        router.post('login', [controllers.AccessTokens, 'store']).as('login')

        router
          .group(() => {
            router.post('logout', [controllers.AccessTokens, 'destroy']).as('logout')
            router.get('me', [controllers.Profile, 'show']).as('me')
            // UC8, UC9: the user's own status and notification setting
            router.patch('me', [controllers.Profile, 'update']).as('updateMe')
          })
          .use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')

    /**
     * UC2, UC4: the user's channel list, and joining or creating a channel by name.
     */
    router
      .group(() => {
        router.get('/', [controllers.Channels, 'index']).as('index')
        router.post('join', [controllers.Channels, 'join']).as('join')
      })
      .prefix('channels')
      .as('channels')
      .use(middleware.auth())

    /**
     * One channel.
     * UC5 /cancel (leave) and UC4 /quit (close, admin only).
     * UC3, UC6, UC7, UC10: its messages and members. Members only.
     * UC4 /invite, /revoke and /kick: each takes { nickName }.
     */
    router
      .group(() => {
        router.delete('membership', [controllers.Channels, 'leave']).as('leave')
        router.delete('/', [controllers.Channels, 'destroy']).as('destroy')
        router.get('messages', [controllers.ChannelMessages, 'index']).as('messages.index')
        router.post('messages', [controllers.ChannelMessages, 'store']).as('messages.store')
        router.get('members', [controllers.ChannelMembers, 'index']).as('members.index')
        router.post('invite', [controllers.ChannelMembers, 'invite']).as('members.invite')
        router.post('revoke', [controllers.ChannelMembers, 'revoke']).as('members.revoke')
        router.post('kick', [controllers.ChannelMembers, 'kick']).as('members.kick')
      })
      .prefix('channels/:id')
      .where('id', router.matchers.number())
      .as('channels')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
