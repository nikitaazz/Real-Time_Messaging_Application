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
      <div class="text-h4 text-weight-bold q-mb-sm">Join BeBe</div>
      <div class="text-grey-7 q-mb-lg">Create your workspace identity.</div>
      <q-form @submit="register">
        <q-input
          v-model="firstName"
          label="First name"
          outlined
          class="q-mb-md"
          :rules="[value => !!value || 'First name is required']"
        />
        <q-input
          v-model="lastName"
          label="Last name"
          outlined
          class="q-mb-md"
          :rules="[value => !!value || 'Last name is required']"
        />
        <q-input
          v-model="nickName"
          label="Unique nickname"
          outlined
          class="q-mb-md"
          :rules="[value => !!value || 'Nickname is required']"
        />
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
          :rules="[value => value.length >= 6 || 'Use at least 6 characters']"
        />
        <q-btn
          type="submit"
          color="primary"
          label="Register"
          class="full-width"
          unelevated
        />
      </q-form>
      <div class="q-mt-lg text-center"
        >Already a member? <router-link to="/login">Login</router-link></div
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
const firstName = ref("");
const lastName = ref("");
const nickName = ref("");
const email = ref("");
const password = ref("");

function register() {
  store.register(email.value, firstName.value, lastName.value, nickName.value);
  void router.push("/main");
}
</script>
