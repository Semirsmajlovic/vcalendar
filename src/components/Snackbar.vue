<template>
    <div>
        <v-snackbar v-model="show" :timeout="timeout">
            <span class="text-center">{{ message }}</span>
            <template v-slot:action="{ attrs }">
                <v-btn color="blue" text v-bind="attrs" @click="show = false">
                    Close
                </v-btn>
            </template>
        </v-snackbar>
    </div>
</template>

<script>
export default {
    name: "Snackbar",
    data() {
        return {
            show: false,
            message: "",
            timeout: 2000,
        };
    },
    created: function () {
        this.$store.watch(
            (state) => state.snackMessage,
            () => {
                if (this.$store.state.snackMessage) {
                    this.show = true;
                    this.message = this.$store.state.snackMessage;
                    this.$store.state.snackMessage = "";
                }
            }
        );
    },
};
</script>
