<template>
    <div>
        <Calendar />
        <Snackbar />
    </div>
</template>

<script>
import Calendar from "@/components/Calendar";
import Snackbar from "@/components/Snackbar";

export default {
    name: "Home",
    components: {
        Calendar,
        Snackbar,
    },
};
</script>

<style>
/* Home.vue specific styles */
</style>