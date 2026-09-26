<template>
    <q-page class="flex flex-center column">
        <div>
            <q-typography variant="h4" class="text-center">Private information </q-typography>
            <q-input filled v-model="email" label="Email" type="email" />
            <q-input filled v-model="password" label="Password" type="password" />
            <q-typography variant="h4" class="text-center">Username will be displayed to others </q-typography>
            <q-input filled v-model="username" label="Username" type="text" />
            <q-btn text-color="white" class="background-header-default full-width" to = "/main"  @click="register">Register</q-btn>
        </div>
        <div>
            <q-typography variant="h4" class="text-center">I already have an account </q-typography>
            <router-link to="/login" class="registration-link">
                Login
            </router-link>
        </div>
    </q-page>
</template>

<script></script>

<style></style>