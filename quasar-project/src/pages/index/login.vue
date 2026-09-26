<template>
  <q-page class="auth-page flex flex-center q-pa-md">
    <q-btn
      class="theme-toggle absolute-top-right q-ma-md"
      flat round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      aria-label="Toggle theme"
      @click="toggleTheme"
    />
    <q-card class="auth-card q-pa-lg">
      <div class="text-h4 text-weight-bold q-mb-sm">Welcome back to BeBe</div>
      <div class="text-grey-7 q-mb-lg">A calm, focused place to talk.</div>
      <q-form @submit="login">
        <q-input
          v-model="email"
          label="Email"
          type="email"
          outlined
          class="q-mb-md"
          :rules="[value => !!value || 'Email is required']"
        />
        <q-input
          v-model="password"
          label="Password"
          type="password"
          outlined
          class="q-mb-lg"
          :rules="[value => !!value || 'Password is required']"
        />
        <q-btn
          type="submit"
          color="primary"
          label="Login"
          class="full-width"
          unelevated
        />
      </q-form>
      <div class="q-mt-lg text-center"
        >New here?
        <router-link to="/registration">Create an account</router-link></div
      >
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useChatStore } from "@/stores/example-store";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const store = useChatStore();
const { isDark, toggleTheme } = useTheme();
const email = ref("");
const password = ref("");

function login() {
  store.login(email.value, email.value.split("@")[0] || "Alex");
  void router.push("/main");
}
</script>
