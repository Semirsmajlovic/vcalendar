<template>
    <v-container id="dynamicContentArea456">
        <v-row class="fill-height">
            <v-col>

                <!-- Start: Calendar Toolbar -->
                <calendar-tool-bar
                    :reference="this.$refs.calendar"
                    :focus="focus"
                    :events="events"
                    :propType="type"
                    @todayButtonClick="viewToday"
                    @typeDay="changeType('day')"
                    @typeWeek="changeType('week')"
                    @typeMonth="changeType('month')"
                    @type4day="changeType('4day')"
                ></calendar-tool-bar>
                <!-- End: Calendar Toolbar -->

                <v-container>
                    <v-row>
                        <v-row>
                            <!-- Calendar Column -->
                            <v-col
                                :cols="isLoggedIn ? '12' : '10'"
                                :lg="isLoggedIn ? '10' : '12'"
                                id="calendarContent"
                            >
                                <v-calendar
                                    ref="calendar"
                                    v-model="focus"
                                    :type="type"
                                    :events="events"
                                    :event-height="112"
                                    :events-more="false"
                                    :event-margin-bottom="5"
                                    :show-week="false"
                                    @click:event="handleClickEvent"
                                    @click:date="handleClickDate"
                                    @click:day="handleClickDay"
                                    @change="refreshEvents"
                                >
                                    <template v-slot:event="{ event }">
                                        <calendar-day :event="event"></calendar-day>
                                    </template>
                                </v-calendar>
                            </v-col>

                            <!-- Sidebar Column -->
                            <v-col
                                v-if="isLoggedIn"
                                cols="12"
                                lg="2"
                            >
                                <calendar-side-bar @selectedPerson="refreshEvents()" :focus="focus"></calendar-side-bar>
                            </v-col>
                        </v-row>
                    </v-row>
                </v-container>
            </v-col>
        </v-row>
        <calendar-event-dialog
            :newDay="newDay"
            :selectedEvent="selectedEvent"
            :selectedWeekdayNum="selectedWeekdayNum"
            :originalData="originalData"
            @refresh="refreshEvents()"
        ></calendar-event-dialog>
        <calendar-volunteer-dialog
            v-model="showVolunteerDialog"
            :selected-event="selectedEvent"
        ></calendar-volunteer-dialog>
    </v-container>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from "vuex";
import CalendarDay from "./CalendarDay.vue";
import CalendarToolBar from "./CalendarToolBar.vue";
import CalendarSideBar from "./CalendarSideBar.vue";
import CalendarEventDialog from "./CalendarEventDialog.vue";
import CalendarVolunteerDialog from "./CalendarVolunteerDialog.vue";

export default {
    name: "Calendar",
    components: {
        CalendarDay,
        CalendarToolBar,
        CalendarSideBar,
        CalendarEventDialog,
        CalendarVolunteerDialog,
    },
    data() {
        return {
            menu: false,
            focus: "",
            type: "month",
            selectedEvent: {},
            originalData: {}, // Keep the original data for reference before user updates form. Used in updateInstance for recurring events
            selectedWeekdayNum: 0,
            newDay: {},
            events: [],
            isBusy: false,
            showVolunteerDialog: false,
        };
    },
    computed: {
        ...mapGetters("storeCalendar", [
            "eventOpen",
            "getCurrentEvent",
            "getInstances",
            "getExceptions",
            "getSelectedPerson",
        ]),
        isLoggedIn() {
            return !!this.$store.state.user;
        },
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", ["initInstances", "dialogOpen"]),
        viewToday() {
            this.focus = "";
        },
        // New method to handle click events conditionally
        handleClickEvent(event) {
            if (this.isLoggedIn) {
                this.updateShift(event);
            } else {
                this.openVolunteerDialog(event);
            }
        },

        // New method to handle click on dates conditionally
        handleClickDate(day) {
            if (this.isLoggedIn) {
                this.createShift(day);
            }
        },

        /**
         * This method is triggered when a day (day number on map) is clicked in the calendar. It checks if the user is logged in.
         * If the user is logged in, it proceeds to create an event for the clicked day by calling the `createShift` method.
         * 
         * It's referenced in the `<v-calendar>` component within the same file, specifically bound to the `@click:day` event.
         * This means whenever a day is clicked in the calendar, this method is invoked to handle the action conditionally based on the user's authentication status.
         */
        handleClickDay(day) {
            if (this.isLoggedIn) {
                this.createShift(day);
            }
        },

        // ========================================================================================== //

        /**
         * Initiates the process to create a new event based on the selected day. It sets up necessary data for the event creation dialog.
         * 
         * - `selectedWeekdayNum` is set to the weekday number of the clicked day, useful for any logic that depends on the day of the week.
         * - `selectedEvent` is reset to an empty object, preparing for a new event creation.
         * - `originalData` is also reset, ensuring no residual data from previous events affects the new event.
         * - `newDay` is set to the day object received from the click, containing all the day's relevant data.
         * - Finally, it opens the event creation dialog by setting `dialogOpen` to true.
         * 
         * This method is called from `handleClickDay` when a day is clicked in the calendar by a logged-in user, facilitating the creation of a new event for that day.
         */
        /* OLD SCENARIO
        createShift(day) {
            this.selectedWeekdayNum = day.weekday;
            this.selectedEvent = {};
            this.originalData = {};
            this.newDay = day;
            this.dialogOpen(true);
        },
        */

        // Method to reset event data
        // NEW SCENARIO
        resetShiftData() {
            this.selectedWeekdayNum = 0;
            this.selectedEvent = {};
            this.originalData = {};
            this.newDay = {};

            // Logging for debugging purposes
            console.log('Calendar[resetShiftData]: Shift data has been reset');
        },

        // NEW SCENARIO
        createShift(day) {
            try {
                // Validation (example, ensure day.weekday exists)
                if (typeof day.weekday === 'undefined') {
                    throw new Error('Invalid day object: missing weekday');
                }

                this.selectedWeekdayNum = day.weekday;
                this.selectedEvent = {};
                this.originalData = {};
                this.newDay = day;

                // Dispatch the Vuex action
                this.$store.dispatch("storeCalendar/dialogOpen", true)
                    .then(() => {
                        console.log('Dialog opened successfully');
                    })
                    .catch(error => {
                        console.error('Failed to open dialog:', error);
                        // Optionally, reset event data on failure
                        this.resetShiftData();
                        // Handle error (e.g., show user feedback)
                        this.updateSnackMessage(`Error: ${error.message}`);
                    });
            } catch (error) {
                console.error('Failed to create event:', error);
                this.resetShiftData();
                this.updateSnackMessage(`Error: ${error.message}`);
            }
        },

        // ========================================================================================== //

        updateShift({ nativeEvent, event, eventParsed }) {
            this.selectedWeekdayNum = eventParsed.start.weekday;
            this.selectedEvent = this.getCurrentEvent(event);

            // Keep the original data before user interacts with form.  Used in updateInstance for recurring events
            this.originalData = { ...this.selectedEvent };

            // Reset newDay to empty object and stop propagation or opening dialog will not be current when clicking on new date and selected date
            this.newDay = {};
            nativeEvent.stopPropagation();

            this.dialogOpen(true);
        },
        async refreshEvents() {
            this.isBusy = true;
            try {
                await this.initInstances({
                    focus: this.focus,
                    name: this.getSelectedPerson.name,
                    type: this.getSelectedPerson.type,
                });
            } catch (e) {
                this.updateSnackMessage(`Error loading ${e} `);
            } finally {
                this.isBusy = false;
                this.events = this.getInstances(
                    this.focus,
                    this.getSelectedPerson.name,
                    this.getSelectedPerson.type
                );

                // Clear props
                this.newDay = {};
                this.selectedEvent = {};
            }
        },
        changeType(newType) {
            this.type = newType;
        },
        openVolunteerDialog(event) {
            this.selectedEvent = event.event; // Set the selectedEvent with the event data
            this.showVolunteerDialog = true; // This will open the dialog
        },
    },
};
</script>

<style lang="scss" scoped>
.v-calendar-weekly {
    display: table;
    table-layout: fixed;
}
.v-calendar-weekly__week {
    height: auto;
    display: table-row;
}
.v-calendar-weekly__day {
    display: table-cell;
    width: calc(100% / 7);
}

.v-calendar-weekly__head {
    height: auto;
    display: table-row;
}

.v-calendar-weekly__head-weekday {
    display: table-cell;
    width: calc(100% / 7);
}

/*  END FIX */
</style>