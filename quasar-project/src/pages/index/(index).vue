<template>
  <q-page class="landing-page flex flex-center q-pa-md">
    <q-btn
      class="theme-toggle absolute-top-right q-ma-md"
      flat round
      :icon="isDark ? 'light_mode' : 'dark_mode'"
      :aria-label="isDark ? 'Use light theme' : 'Use dark theme'"
      @click="toggleTheme"
    />
    <q-card class="landing-card text-center q-pa-xl">
      <div class="text-h2 text-weight-bold">BeBe</div>
      <div class="text-subtitle1 text-grey-7 q-mt-sm q-mb-xl"
        >Thoughtful conversations, made simple.</div
      >
      <div class="row justify-center q-gutter-sm">
        <q-btn color="primary" label="Login" to="/login" unelevated />
        <q-btn
          outline
          color="primary"
          label="Create account"
          to="/registration"
        />
      </div>
      <div class="text-caption text-grey-6 q-mt-xl">A warm, focused space for your people.</div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { useTheme } from "@/composables/useTheme";

const { isDark, toggleTheme } = useTheme();
</script>
