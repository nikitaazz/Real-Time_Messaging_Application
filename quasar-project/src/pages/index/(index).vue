<template>
  <q-page>
      <q-btn text-color="white" class="background-header-default width" to = "/login" @click="login">Login</q-btn>
      <q-btn text-color="white" class="background-header-default width" to = "/registration" @click="register">Register</q-btn>
      <q-btn text-color="white" class="background-header-default width" to = "/main" @click="main">Main</q-btn>
  </q-page>
</template>

<script setup lang="ts">
// function 
import { ref } from "vue";

const items = ref([1, 2, 3, 4, 5]);

function loadMore(index: number, done: () => void) {
  if (items.value.length >= 30) {
    done();
    return;
  }

  items.value.push(
    items.value.length + 1,
    items.value.length + 2,
    items.value.length + 3,
    items.value.length + 4,
    items.value.length + 5
  );

  done();
}
</script>
