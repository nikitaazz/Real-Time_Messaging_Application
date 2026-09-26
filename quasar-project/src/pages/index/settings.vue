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
      <q-select
        v-model="selected"
        :options="options"
        label="Choose option"
      />

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