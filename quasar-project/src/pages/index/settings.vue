<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar class="background-header-default text-white">
        <q-toolbar-title>BeBe</q-toolbar-title>

        <q-btn
          color="#3e010e"
          icon="arrow_back"
          text-color="white"
          to="/main"
          label="Back"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
        <q-typography variant="h4" class="text-center h1 column">Settings</q-typography>
        <q-typography variant="h6" class="text-center">Change your status and notification settings</q-typography>
        <q-select
            v-model="selected"
            :options="options"
            label="Choose option"
        />
        <q-typography variant="h6" class="text-center">Enable or disable notifications</q-typography>
        <q-toggle
            v-model="enabled"
            label="Notifications"
        />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";

const selected = ref(null);
const enabled = ref(false);

const options = [
  "Ofline",
  "Online",
  "Away"
];
</script>