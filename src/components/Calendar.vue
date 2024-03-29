<template>
    <v-container id="dynamicContentArea456" fluid>
        <v-row justify="center" v-if="!isLoggedIn">
            <v-col cols="12" sm="8" md="6" lg="6">
                <v-alert
                    text
                    dense
                    color="info"
                    border="top"
                >
                    <v-row align="center" justify="center">
                        <v-col class="grow">
                            For organizations interested in volunteering, please register your participation by clicking the button to join our efforts in making a difference.
                        </v-col>
                        <v-col class="shrink">
                        <v-btn @click="showOrganizationDialog = true" color="primary">Participate</v-btn>
                        </v-col>
                    </v-row>
                </v-alert>
                <organization-dialog :value="showOrganizationDialog" @input="showOrganizationDialog = $event"></organization-dialog>
            </v-col>
        </v-row>
        <v-row class="fill-height">
            <v-col>
                <!-- Start: Calendar Toolbar -->
                <calendar-tool-bar
                    :reference="this.$refs.calendar"
                    :focus="focus"
                    :shifts="shifts"
                    :propType="type"
                    @todayButtonClick="viewToday"
                    @typeDay="updateCalendarViewType('day')"
                    @typeWeek="updateCalendarViewType('week')"
                    @typeMonth="updateCalendarViewType('month')"
                    @type4day="updateCalendarViewType('4day')"
                ></calendar-tool-bar>
                <!-- End: Calendar Toolbar -->
                <v-row>
                    <v-col :cols="isLoggedIn ? '12' : '10'" :lg="isLoggedIn ? '10' : '12'" id="calendarContent">
                        <v-overlay
                            :value="isBusy"
                            :opacity="0.6"
                            color="white"
                        >
                            <v-progress-circular
                                indeterminate
                                color="blue"
                                size="128"
                            ></v-progress-circular>
                        </v-overlay>
                        <div class="printInformationArea"></div>
                        <v-calendar
                            ref="calendar"
                            v-model="focus"
                            :type="type"
                            :events="shifts"
                            event-color="#f1f3f4"
                            event-text-color="#333"
                            :event-margin-bottom="5"
                            :event-height="135"
                            :events-more="false"
                            :show-week="false"
                            @click:event="handleClickEvent"
                            @click:date="!isDateBeforeToday($event) && isLoggedIn ? prepareAndOpenShiftCreationDialog($event) : null"
                            @click:day="!isDateBeforeToday($event) && isLoggedIn ? prepareAndOpenShiftCreationDialog($event) : null"
                            @change="loadAndUpdateShifts"
                        >
                        <template v-slot:event="{ event }">
                        <calendar-day :event="event" :is-logged-in="isLoggedIn"></calendar-day>
                        </template>
                    </v-calendar>
                    </v-col>
                    <v-col v-if="isLoggedIn" cols="12" lg="2">
                    <calendar-side-bar @selectedParticipant="loadAndUpdateShifts()" :focus="focus"></calendar-side-bar>
                    </v-col>
                </v-row>
            </v-col>
        </v-row>
        <!-- Components -->
        <calendar-event-dialog
            :dateForNewShift="dateForNewShift"
            :updateLocalStateOnShiftSelectionChange="selectedShift"
            :selectedWeekdayNum="selectedWeekdayNum"
            :originalData="originalData"
            @refresh="loadAndUpdateShifts()"
        ></calendar-event-dialog>
        <calendar-volunteer-dialog
            v-model="showVolunteerDialog"
            :selectedShift="selectedShift"
            @dialogs-completed="fetchUpdatedShifts"
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
import OrganizationDialog from "./OrganizationDialog.vue";

export default {
    name: "Calendar",
    components: {
        CalendarDay,
        CalendarToolBar,
        CalendarSideBar,
        CalendarEventDialog,
        CalendarVolunteerDialog,
        OrganizationDialog,
    },
    data() {
        return {
            menu: false,
            focus: "",
            type: "month",
            selectedShift: {},
            originalData: {}, // Keep the original data for reference before user updates form. Used in updateInstance for recurring shifts
            selectedWeekdayNum: 0,
            dateForNewShift: {},
            shifts: [],
            isBusy: false,
            showVolunteerDialog: false,
            showOrganizationDialog: false,
        };
    },
    computed: {
        ...mapGetters("storeCalendar", [
            "eventOpen",
            "getCurrentEvent",
            "getInstances",
            "getExceptions",
            "getSelectedParticipant",
        ]),
        isLoggedIn() {
            return !!this.$store.state.user;
        },
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", ["initInstances", "adminShiftDialogOpen"]),

        viewToday() {
            this.focus = "";
        },

        isDateBeforeToday(dateStr) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to 00:00:00 for accurate comparison
            const eventDate = new Date(dateStr);
            return eventDate < today; // Returns true if eventDate is before today
        },

        fetchUpdatedShifts() {
            this.loadAndUpdateShifts(); // Assuming this method refreshes the shifts displayed in the calendar
        },

        handleClickEvent(event) {
            // Extracting the date string from event.day
            const eventDateStr = event.day.date;
            if (!this.isDateBeforeToday(eventDateStr)) {
                if (this.isLoggedIn) {
                    this.handleShiftSelection(event);
                } else {
                    this.openVolunteerDialog(event);
                }
            }
            // If the event's date is before today, do nothing.
        },

        // ========================================================================================== //

        prepareAndOpenShiftCreationDialog(day) {
            // Check if the selected day is before today and exit if true
            if (this.isDateBeforeToday(day.date)) {
                this.updateSnackMessage(`Shift creation is not permitted for past dates or the current day.`);
                console.warn('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Attempted to create or edit a shift for a past date.');
                return; // Exit the method to prevent opening the dialog for past dates
            }

            try {
                if (typeof day.weekday === 'undefined') {
                    throw new Error('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Invalid day object: missing weekday'); // Validates the day object to ensure it has a 'weekday' property
                }
                this.selectedWeekdayNum = day.weekday; // Sets the selected weekday number based on the day object
                this.selectedShift = {}; // Resets the selected shift data, preparing for a new shift creation
                this.originalData = {}; // Clears any original data stored for comparison or rollback
                this.dateForNewShift = day; // Sets the dateForNewShift object to the day parameter, preparing it for a new event
                this.$store.dispatch("storeCalendar/adminShiftDialogOpen", true) // Dispatches an action to open the shift creation dialog
                    .then(() => {})
                    .catch(error => {
                        console.error('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Failed to open dialog: ', error); // Logs error if dialog opening fails
                        this.selectedWeekdayNum = 0; // Resets the selected weekday number to its default value
                        this.selectedShift = {}; // Clears the selected shift data
                        this.originalData = {}; // Clears the original data stored for comparison or rollback
                        this.dateForNewShift = {}; // Resets the dateForNewShift object, clearing any data prepared for a new event
                        this.updateSnackMessage(`Error: ${error.message}`); // Displays an error message to the user
                    });
            } catch (error) {
                console.error('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Failed to create event: ', error); // Logs error if the entire operation fails
                this.selectedWeekdayNum = 0; // Resets the selected weekday number to its default value
                this.selectedShift = {}; // Clears the selected shift data
                this.originalData = {}; // Clears the original data stored for comparison or rollback
                this.dateForNewShift = {}; // Resets the dateForNewShift object, clearing any data prepared for a new event
                this.updateSnackMessage(`Error: ${error.message}`); // Displays an error message to the user
            }
        },

        // ========================================================================================== //

        handleShiftSelection({ nativeEvent, event, eventParsed }) {
            this.selectedWeekdayNum = eventParsed.start.weekday; // Sets the weekday number of the event start date
            this.selectedShift = this.getCurrentEvent(event); // Retrieves and sets the current event data
            this.originalData = { ...this.selectedShift }; // Creates a copy of the selectedShift to keep original data before any updates
            this.dateForNewShift = {}; // Resets dateForNewShift, preparing for a new event creation or update
            nativeEvent.stopPropagation(); // Prevents the click event from bubbling up to parent elements
            this.adminShiftDialogOpen(true); // Opens the dialog for editing or viewing the event details
        },

        // ========================================================================================== //

        // Default: loadAndUpdateShifts() comes back as undefined when clicking on either "All", "Caregiver" or "Client".
        // This: loadAndUpdateShifts() comes back as undefined when clicking on either "All", "Volunteer" or "Driver / Helper".
        async loadAndUpdateShifts() {
            this.isBusy = true;
            try {
                // this.getSelectedParticipant: { name: "Michael Smith", type: "volunteerName" }
                await this.initInstances({ focus: this.focus, name: this.getSelectedParticipant.name, type: this.getSelectedParticipant.type });
            } catch (e) {
                this.updateSnackMessage(`Error loading ${e} `);
            } finally {
                this.isBusy = false; 
                this.shifts = this.getInstances(this.focus, this.getSelectedParticipant.name, this.getSelectedParticipant.type);
                this.dateForNewShift = {};
                this.selectedShift = {};
            }
        },

        // ========================================================================================== //

        updateCalendarViewType(newType) {
            this.type = newType; // Updates the calendar view type (day, week, month, 4day) based on user selection
        },

        // ========================================================================================== //
    
        openVolunteerDialog(event) {
            this.selectedShift = event.event;
            this.showVolunteerDialog = true;
        },

        // ========================================================================================== //
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
</style>