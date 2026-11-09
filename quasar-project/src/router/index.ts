import { defineRouter } from "#q-app";
import { routes, handleHotUpdate } from "vue-router/auto-routes";
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory
} from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { setUnauthorizedHandler } from "@/services/api";

/** Pages that require a logged-in user. */
const protectedPages = ["/main", "/settings"];
/** Pages that make no sense once logged in. */
const guestPages = ["/login", "/registration"];

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(({ store }) => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === "history"
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
  });

  Router.beforeEach(async to => {
    const auth = useAuthStore(store);
    // After a page reload, log back in with the saved token before deciding
    await auth.restore();
    if (protectedPages.includes(to.path) && !auth.isLoggedIn) return "/login";
    if (guestPages.includes(to.path) && auth.isLoggedIn) return "/main";
  });

  // The server rejected the saved token (expired, or logged out elsewhere)
  setUnauthorizedHandler(() => {
    useAuthStore(store).clearSession();
    void Router.push("/login");
  });

  // enable HMR for it
  if (import.meta.hot) {
    handleHotUpdate(Router);
  }

  return Router;
});
