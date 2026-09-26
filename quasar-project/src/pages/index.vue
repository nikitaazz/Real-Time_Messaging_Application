<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="background-header-default text-white">
        <!-- <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        /> -->

        <q-toolbar-title> BeBe </q-toolbar-title>

        <!--to do implement user settings page with user photo above -->
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
      <q-btn text-color="white" class="background-header-default width" to = "/login" @click="login">Login</q-btn>
      <q-btn text-color="white" class="background-header-default width" to = "/registration" @click="register">Register</q-btn>
      <q-btn text-color="white" class="background-header-default width" to = "/main" @click="main">Main</q-btn>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">

</script>