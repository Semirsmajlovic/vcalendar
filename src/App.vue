<template>
    <v-app>
        <v-app-bar app color="primary" flat dark>
            <v-spacer></v-spacer>
            <div class="d-flex align-center">
                <v-img
                    alt="Vuetify Logo"
                    class="shrink ml-12 mr-2"
                    contain
                    src="https://cdn.vuetifyjs.com/images/logos/vuetify-logo-dark.png"
                    transition="scale-transition"
                    width="40"
                />

                <span class="font-weight-bold logo">VCARENDAR</span>
            </div>

            <v-spacer></v-spacer>
            <v-btn
                depressed
                small
                color="blue"
                @click.stop="changeDrawer"
                class="hidden-lg-and-up"
                >Menu
            </v-btn>
        </v-app-bar>

        <v-main>
            <Calendar />
            <Snackbar />
        </v-main>
    </v-app>
</template>

<script>
import { mapMutations } from "vuex";
import Calendar from "@/components/Calendar";
import Snackbar from "@/components/Snackbar";
export default {
    name: "App",
    components: {
        Calendar,
        Snackbar,
    },
    data: () => ({
        //
    }),
    methods: {
        ...mapMutations(["drawerChange"]),
        changeDrawer() {
            this.drawerChange();
        },
    },
};
</script>

<style lang="scss" >
.logo {
    font-size: 1.75rem;
}

.title--text {
    font-size: 1.5rem;
}
</style>