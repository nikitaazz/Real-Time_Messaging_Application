<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar class="background-header-default text-white">
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> BeBe </q-toolbar-title>

        <!--to do implement user settings page with user photo above -->
        <q-btn 
          color = "#3e010e"
          icon="settings"
          text-color = "white"
          to = "/settings">
            Account
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Chats </q-item-label>

        <EssentialLink
          v-for="link in linksList"
          :key="link.label"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
    <q-footer>
      <q-input
        v-model="message_cli"
        outlined
        placeholder="Write a message..."
        class="background-cli-default message-input"
      >
        <template v-slot:append>
          <q-btn
            flat
            round
            icon="send"
            color="white"
            @click="sendMessageCLI"
          />
        </template>
      </q-input>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import EssentialLink, {
  type EssentialLinkProps
} from "@/components/EssentialLink.vue";

const linksList: EssentialLinkProps[] = [
  {
    label: "Zahar",
    caption: "last-message",
    // icon: "",
    link: "https://quasar.dev"
  },
  {
    label: "Nikita",
    caption: "last-message",
    // icon: "code",
    link: "https://github.com/quasarframework"
  }
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>