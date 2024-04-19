<template>
    <v-container fluid class="event__inner pt-1" :class="event.isRecurring ? '' : 'nonRecurringEvent'">
        <v-row no-gutters>
            <v-col>
                <div class="text-caption font-weight-medium">
                    <!-- Recurring Shift Icon -->
                    <v-icon small v-if="event.isRecurring">mdi-repeat</v-icon>
                    <!-- Single Occurrence Shift Icon -->
                    <v-icon small v-else>mdi-calendar</v-icon>
                    {{ event.shiftTitle || (event.isRecurring ? "Recurring Shift" : "Single Occurrence Shift") }}
                </div>
                <div class="font-weight-medium">
                    <v-icon small>mdi-clock</v-icon> {{ formatTimeslot(event.start) }} - {{ formatTimeslot(event.end) }}
                </div>
            </v-col>
        </v-row>
        <v-divider class="grey darken-1 mb-1 mt-1"></v-divider>
        <v-row no-gutters>
            <v-col cols="12">
                <div class="text-caption font-weight-bold">Available Spots:</div>
                <div :class="{ 'strikethrough': availableVolunteerSpots === 0 }" class="text-caption mb-n1">Volunteers: <strong>{{ availableVolunteerSpots }}</strong>/<strong>{{ event.volunteerLimit }}</strong></div>
                <div :class="{ 'strikethrough': availableDriverSpots === 0 }" class="text-caption mb-1">Drivers / Helpers: <strong>{{ availableDriverSpots }}</strong>/<strong>{{ event.driverHelperLimit }}</strong></div>
            </v-col>
        </v-row>
        <v-divider class="grey darken-1 mb-2"></v-divider>
        <v-row no-gutters>
            <v-col cols="12">
                <v-tooltip bottom>
                    <template v-slot:activator="{ on, attrs }">
                        <!-- Disable the button and change the tooltip if the event is in the past -->
                        <v-btn v-if="isLoggedIn" class="d-inline-block" color="primary" x-small v-bind="attrs" v-on="on" :disabled="isEventInPast">Manage</v-btn>
                        <v-btn v-else class="d-inline-block" color="primary" x-small v-bind="attrs" v-on="on" :disabled="isEventInPast">Volunteer</v-btn>
                    </template>
                    <span v-if="isEventInPast">Events are not accessible on past dates.</span>
                    <span v-else-if="isLoggedIn">View participants for this shift.</span>
                    <span v-else>Sign up to help with the shift.</span>
                </v-tooltip>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { parseISO, differenceInMinutes, isPast } from "date-fns";
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

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
        isEventInPast() {
            const timeZone = 'America/Chicago';
            // Convert event.start to the UTC equivalent of the given time in the America/Chicago timezone
            const eventStartTime = zonedTimeToUtc(this.event.start, timeZone);
            // Get the current date in the America/Chicago timezone
            const nowInChicago = utcToZonedTime(new Date(), timeZone);
            // Check if the event start time is in the past
            return isPast(eventStartTime, nowInChicago);
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
        formatTimeslot(dateTimeStr) {
            // Extract the time part from the dateTime string
            const timePart = dateTimeStr.split(' ')[1];
            // Convert to Date object to make use of toLocaleTimeString for formatting
            const time = new Date(`1970-01-01 ${timePart}`);
            // Format the time in AM/PM format and remove the space before AM/PM
            return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ /g, '');
        },
    },
};
</script>

<style lang="scss" scoped>
.event__inner {
    border-top: 3px solid #2091ea;
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