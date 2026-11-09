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
          })
          .use(middleware.auth())
      })
      .prefix('auth')
      .as('auth')
  })
  .prefix('/api/v1')
