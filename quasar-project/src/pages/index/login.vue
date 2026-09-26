<template>
    <q-page class="flex flex-center column">
        <div>
            <q-typography variant="h4" class="text-center">Welcome back to BeBe!</q-typography>
            <q-input filled v-model="email" label="Email" type="email" />
            <q-input filled v-model="password" label="Password" type="password" />
            <q-btn text-color="white" class="background-header-default full-width" to = "/main" @click="login">Login</q-btn>
        </div>
        <br />
        <div>
            <q-typography variant="h4" class="text-center">I don't have an account yet </q-typography>
            <router-link to="/registration" class="registration-link">
                Registration
            </router-link>
        </div>
    </q-page>
</template>

<script></script>

<style></style>