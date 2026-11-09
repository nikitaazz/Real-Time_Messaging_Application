<template>
  <q-page class="auth-page flex flex-center q-pa-md">
    <q-btn
      class="theme-toggle absolute-top-right q-ma-md"
      flat
      round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      aria-label="Toggle theme"
      @click="toggleTheme"
    />
    <q-card class="auth-card q-pa-lg">
      <div class="text-h4 text-weight-bold q-mb-sm">Welcome back to BeBe</div>
      <div class="text-grey-7 q-mb-lg">A calm, focused place to talk.</div>
      <q-banner
        v-if="error"
        dense
        rounded
        class="bg-negative text-white q-mb-md"
        role="alert"
        >{{ error }}</q-banner
      >
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
          :loading="loading"
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
import { useAuthStore } from "@/stores/auth";
import { ApiError } from "@/services/api";
import { useTheme } from "@/composables/useTheme";

const router = useRouter();
const auth = useAuthStore();
const { isDark, toggleTheme } = useTheme();
const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function login() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    void router.push("/main");
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 400)
      error.value = "Wrong email or password.";
    else if (reason instanceof ApiError) error.value = reason.message;
    else error.value = "Login failed. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>
