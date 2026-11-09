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
      <div class="text-h4 text-weight-bold q-mb-sm">Join BeBe</div>
      <div class="text-grey-7 q-mb-lg">Create your workspace identity.</div>
      <q-banner
        v-if="error"
        dense
        rounded
        class="bg-negative text-white q-mb-md"
        role="alert"
        >{{ error }}</q-banner
      >
      <q-form @submit="register">
        <q-input
          v-model="form.firstName"
          label="First name"
          outlined
          class="q-mb-md"
          maxlength="50"
          :error="!!fieldErrors.firstName"
          :error-message="fieldErrors.firstName"
          :rules="[value => !!value.trim() || 'First name is required']"
          @update:model-value="fieldErrors.firstName = ''"
        />
        <q-input
          v-model="form.lastName"
          label="Last name"
          outlined
          class="q-mb-md"
          maxlength="50"
          :error="!!fieldErrors.lastName"
          :error-message="fieldErrors.lastName"
          :rules="[value => !!value.trim() || 'Last name is required']"
          @update:model-value="fieldErrors.lastName = ''"
        />
        <q-input
          v-model="form.nickName"
          label="Unique nickname"
          hint="Letters, digits and _ only. Others mention you with @nickname."
          outlined
          class="q-mb-md"
          maxlength="30"
          :error="!!fieldErrors.nickName"
          :error-message="fieldErrors.nickName"
          :rules="[
            value => value.trim().length >= 2 || 'Use at least 2 characters',
            value =>
              /^[A-Za-z0-9_]+$/.test(value.trim()) ||
              'Use only letters, digits and _'
          ]"
          @update:model-value="fieldErrors.nickName = ''"
        />
        <q-input
          v-model="form.email"
          label="Email"
          type="email"
          outlined
          class="q-mb-md"
          :error="!!fieldErrors.email"
          :error-message="fieldErrors.email"
          :rules="[value => !!value.trim() || 'Email is required']"
          @update:model-value="fieldErrors.email = ''"
        />
        <q-input
          v-model="form.password"
          label="Password"
          type="password"
          outlined
          class="q-mb-md"
          maxlength="32"
          :error="!!fieldErrors.password"
          :error-message="fieldErrors.password"
          :rules="[value => value.length >= 8 || 'Use at least 8 characters']"
          @update:model-value="fieldErrors.password = ''"
        />
        <q-input
          v-model="form.passwordConfirmation"
          label="Confirm password"
          type="password"
          outlined
          class="q-mb-lg"
          maxlength="32"
          :rules="[
            value => value === form.password || 'Passwords do not match'
          ]"
        />
        <q-btn
          type="submit"
          color="primary"
          label="Register"
          class="full-width"
          unelevated
          :loading="loading"
        />
      </q-form>
      <div class="q-mt-lg text-center"
        >Already a member? <router-link to="/login">Login</router-link></div
      >
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore, type RegisterPayload } from "@/stores/auth";
import { ApiError } from "@/services/api";
import { useTheme } from "@/composables/useTheme";

type Field = keyof RegisterPayload;

const router = useRouter();
const auth = useAuthStore();
const { isDark, toggleTheme } = useTheme();
const form = reactive<RegisterPayload>({
  firstName: "",
  lastName: "",
  nickName: "",
  email: "",
  password: "",
  passwordConfirmation: ""
});
const fieldErrors = reactive<Partial<Record<Field, string>>>({});
const loading = ref(false);
const error = ref("");

/** Readable text for the errors the backend validator returns. */
function describe(field: string, rule: string | undefined, fallback: string) {
  if (rule === "database.unique" && field === "nickName")
    return "This nickname is already taken";
  if (rule === "database.unique" && field === "email")
    return "An account with this email already exists";
  if (rule === "email") return "Enter a valid email address";
  return fallback;
}

async function register() {
  error.value = "";
  loading.value = true;
  try {
    await auth.register({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      nickName: form.nickName.trim(),
      email: form.email.trim()
    });
    void router.push("/main");
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 422) {
      for (const item of reason.errors) {
        if (item.field && item.field in form)
          fieldErrors[item.field as Field] = describe(
            item.field,
            item.rule,
            item.message
          );
      }
      if (!reason.errors.some(item => item.field && item.field in form))
        error.value = reason.message;
    } else if (reason instanceof ApiError) error.value = reason.message;
    else error.value = "Registration failed. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>
