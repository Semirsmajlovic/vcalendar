<template>
    <v-container fluid class="event__inner pt-1">
        <v-row no-gutters>
            <v-col>
                <span class="text-caption font-weight-bold">{{ event.shiftTitle || (event.isRecurring ? "Recurring Shift" : "Single Occurrence Shift") }}</span>
            </v-col>
        </v-row>
        <v-divider class="grey darken-1 mb-1 mt-1"></v-divider>
        <v-row no-gutters>
            <v-col cols="12">
                <div class="text-caption font-weight-bold">Available Spots:</div>
                <div :class="{ 'strikethrough': availableVolunteerSpots === 0 }" class="text-caption mb-n1">Volunteers: <strong>{{ availableVolunteerSpots }}</strong></div>
                <div :class="{ 'strikethrough': availableDriverSpots === 0 }" class="text-caption mb-1">Drivers / Helpers: <strong>{{ availableDriverSpots }}</strong></div>
            </v-col>
        </v-row>
        <v-divider class="grey darken-1 mb-2"></v-divider>
        <v-row no-gutters>
            <v-col cols="12">
                <v-tooltip bottom>
                    <template v-slot:activator="{ on, attrs }">
                        <!-- Show this button if the user is logged in -->
                        <v-btn v-if="isLoggedIn" class="d-inline-block" color="primary" x-small v-bind="attrs" v-on="on">Update</v-btn>
                        <!-- Show this button if the user is not logged in -->
                        <v-btn v-else class="d-inline-block" color="primary" x-small v-bind="attrs" v-on="on" :disabled="isDayPassed">Volunteer</v-btn>
                    </template>
                    <span v-if="isLoggedIn">View participants for this shift.</span>
                    <span v-else>Sign up to help with the shift.</span>
                </v-tooltip>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { parseISO, differenceInMinutes } from "date-fns";

export default {
    name: "CalendarDay",
    components: {},
    data() {
        return {};
    },
    props: {
        event: {
            type: Object,
            default() {
                return {};
            },
        },
        isLoggedIn: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        availableVolunteerSpots() {
            if (this.event.volunteerLimit && Array.isArray(this.event.volunteerNames)) {
                return this.event.volunteerLimit - this.event.volunteerNames.length;
            }
            return 0;
        },
        availableDriverSpots() {
            if (this.event.driverHelperLimit && Array.isArray(this.event.driverHelperNames)) {
                return this.event.driverHelperLimit - this.event.driverHelperNames.length;
            }
            return 0;
        },
        isDayPassed() {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to 00:00:00 for accurate comparison

            // Assuming this.event.end is in "YYYY-MM-DD HH:MM" format
            const eventEndDate = parseISO(this.event.end);

            return eventEndDate < today; // Returns true if the event end day has passed
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
    },
};
</script>

<style lang="scss" scoped>
/* day event container styling */
.event__inner {
    outline: 1px solid #cccccc; /* Light gray outline */
    outline-offset: -1px; /* Adjusts the outline to be inside the element if needed */
    &:hover {
        background-color: #e3eefa;
    }
}
.nonRecurringEvent {
    border-top: 3px solid #4caf50;
}
.strikethrough {
    text-decoration: line-through;
}
</style>