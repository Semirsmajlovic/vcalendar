<template>
    <v-container fluid class="event__inner pt-1">
        <v-row no-gutters>
            <v-col cols="12">
                <div class="text-caption font-weight-bold">Available Spots:</div>
                <div class="text-caption mb-n1">Volunteers: <strong>3</strong></div>
                <div class="text-caption mb-1">Drivers: <strong>2</strong></div>
            </v-col>
        </v-row>
        <v-divider class="grey darken-1 mb-2"></v-divider>
        <v-row no-gutters>
            <v-col cols="12"> <!-- Use full width for the column -->
                <v-btn color="primary" x-small @click="showVolunteerDialog">Click to Volunteer</v-btn> <!-- Add the button -->
            </v-col>
        </v-row>
        <CalendarVolunteerDialog v-model="volunteerDialogVisible"></CalendarVolunteerDialog>
    </v-container>
</template>

<!-- <template>
    <div
        class="event__inner"
        :class="event.isRecurring ? '' : 'nonRecurringEvent'"
    >
        <v-container class="ma-0 pa-0">
            <v-row no-gutters>
                <v-col cols="12" class="mb-2">
                    <span class="body-2 mb-6">{{ event.caregiver }}</span>
                </v-col>

                <v-col cols="12" class="mb-2">
                    <span class="body-2">{{ event.client }}</span>
                </v-col>

                <v-col cols="12">
                    <span class="body-2">{{ displayTime(event.start) }}</span> -
                    <span class="body-2">{{ displayTime(event.end) }}</span>

                    <span
                        class="ml-5 font-weight-normal blue--text text--darken-3"
                        ><span class="mr-1">HRS</span
                        >{{ duration(event) }}</span
                    >
                </v-col>
            </v-row>
        </v-container>
    </div>
</template> -->

<script>
import { parseISO, differenceInMinutes } from "date-fns";
import CalendarVolunteerDialog from './CalendarVolunteerDialog.vue';

export default {
    name: "CalendarDay",
    components: {
        CalendarVolunteerDialog
    },
    data() {
        return {
            volunteerDialogVisible: false,
        };
    },
    props: {
        event: {
            type: Object,
            default() {
                return {};
            },
        },
    },
    methods: {
        duration(eventObj) {
            return (
                Math.abs(differenceInMinutes(parseISO(eventObj.start), parseISO(eventObj.end))) / 60
            );
        },
        displayTime(time) {
            return time.slice(11);
        },
        showVolunteerDialog() {
            this.volunteerDialogVisible = true; // Method to show the dialog
        },
    },
};
</script>

<style lang="scss" scoped>
/* day event container styling */
.event__inner {
    background-color: #f1f3f4;
    color: #333 !important;
    border-top: 3px solid #2091ea;

    &:hover {
        background-color: #e3eefa;
    }
}

.nonRecurringEvent {
    border-top: 3px solid #4caf50;
}
</style>