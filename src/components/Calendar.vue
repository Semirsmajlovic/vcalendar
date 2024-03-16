<template>
    <v-container id="dynamicContentArea456" fluid>
      <v-row class="fill-height">
        <v-col>
          <v-row>
            <v-col :cols="isLoggedIn ? '12' : '10'" :lg="isLoggedIn ? '10' : '12'" id="calendarContent">
              <!-- Start: Calendar Toolbar -->
              <calendar-tool-bar
                :reference="this.$refs.calendar"
                :focus="focus"
                :shifts="shifts"
                :propType="type"
                @todayButtonClick="viewToday"
                @typeDay="changeType('day')"
                @typeWeek="changeType('week')"
                @typeMonth="changeType('month')"
                @type4day="changeType('4day')"
              ></calendar-tool-bar>
              <!-- End: Calendar Toolbar -->
              <v-calendar
                ref="calendar"
                v-model="focus"
                :type="type"
                :events="shifts"
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
            <v-col v-if="isLoggedIn" cols="12" lg="2">
              <calendar-side-bar @selectedParticipant="refreshEvents()" :focus="focus"></calendar-side-bar>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <calendar-event-dialog
        :newDay="newDay"
        :selectedEvent="selectedShift"
        :selectedWeekdayNum="selectedWeekdayNum"
        :originalData="originalData"
        @refresh="refreshEvents()"
      ></calendar-event-dialog>
      <calendar-volunteer-dialog
        v-model="showVolunteerDialog"
        :selectedShift="selectedShift"
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
            selectedShift: {},
            originalData: {}, // Keep the original data for reference before user updates form. Used in updateInstance for recurring shifts
            selectedWeekdayNum: 0,
            newDay: {},
            shifts: [],
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
            "getSelectedParticipant",
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


        handleClickEvent(event) {
            if (this.isLoggedIn) {
                this.updateShift(event);
            } else {
                this.openVolunteerDialog(event);
            }
        },

        // ========================================================================================== //

        handleClickDate(day) {
            if (this.isLoggedIn) {
                this.prepareAndOpenShiftCreationDialog(day); // If the user is logged in, prepares and opens the dialog for shift creation based on the clicked date. Used in the v-calendar component's @click:date event.
            }
        },

        // ========================================================================================== //

        handleClickDay(day) {
            if (this.isLoggedIn) {
                this.prepareAndOpenShiftCreationDialog(day); // If the user is logged in, prepares and opens the dialog for shift creation based on the clicked day. Used in the v-calendar component's @click:day event.
            }
        },

        // ========================================================================================== //

        prepareAndOpenShiftCreationDialog(day) {
            try {
                if (typeof day.weekday === 'undefined') {
                    throw new Error('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Invalid day object: missing weekday'); // Validates the day object to ensure it has a 'weekday' property
                }
                this.selectedWeekdayNum = day.weekday; // Sets the selected weekday number based on the day object
                this.selectedShift = {}; // Resets the selected shift data, preparing for a new shift creation
                this.originalData = {}; // Clears any original data stored for comparison or rollback
                this.newDay = day; // Sets the newDay object to the day parameter, preparing it for a new event
                this.$store.dispatch("storeCalendar/dialogOpen", true) // Dispatches an action to open the shift creation dialog
                    .then(() => {
                        console.log('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Dialog opened successfully.'); // Logs success message on successful dialog opening
                    })
                    .catch(error => {
                        console.error('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Failed to open dialog: ', error); // Logs error if dialog opening fails
                        this.resetShiftData(); // Resets shift data on failure to open dialog
                        this.updateSnackMessage(`Error: ${error.message}`); // Displays an error message to the user
                    });
            } catch (error) {
                console.error('[Calendar.vue/prepareAndOpenShiftCreationDialog]: Failed to create event: ', error); // Logs error if the entire operation fails
                this.resetShiftData(); // Resets shift data on operation failure
                this.updateSnackMessage(`Error: ${error.message}`); // Displays an error message to the user
            }
        },

        resetShiftData() {
            this.selectedWeekdayNum = 0; // Resets the selected weekday number to its default value
            this.selectedShift = {}; // Clears the selected shift data
            this.originalData = {}; // Clears the original data stored for comparison or rollback
            this.newDay = {}; // Resets the newDay object, clearing any data prepared for a new event
            console.log('[Calendar.vue/resetShiftData]: Shift data has been reset.'); // Logs a message indicating that the shift data has been reset
        },

        // ========================================================================================== //

        updateShift({ nativeEvent, event, eventParsed }) {
            this.selectedWeekdayNum = eventParsed.start.weekday; // Sets the weekday number of the event start date
            this.selectedShift = this.getCurrentEvent(event); // Retrieves and sets the current event data
            this.originalData = { ...this.selectedShift }; // Creates a copy of the selectedShift to keep original data before any updates
            this.newDay = {}; // Resets newDay, preparing for a new event creation or update
            nativeEvent.stopPropagation(); // Prevents the click event from bubbling up to parent elements
            this.dialogOpen(true); // Opens the dialog for editing or viewing the event details
        },

        // ========================================================================================== //

        async refreshEvents() {
            this.isBusy = true; // Indicates the start of an asynchronous operation, typically used to trigger loading indicators
            try {
                await this.initInstances({ // Asynchronously initializes event instances based on the current focus, participant's name, and type
                    focus: this.focus,
                    name: this.getSelectedParticipant.name,
                    type: this.getSelectedParticipant.type,
                });
            } catch (e) {
                this.updateSnackMessage(`Error loading ${e} `); // Displays an error message if the initialization fails
            } finally {
                this.isBusy = false; // Resets the loading indicator to false, indicating the operation has completed
                this.shifts = this.getInstances( // Retrieves and sets the shifts based on the current focus, participant's name, and type
                    this.focus,
                    this.getSelectedParticipant.name,
                    this.getSelectedParticipant.type
                );
                this.newDay = {}; // Resets the newDay object, typically used to clear form data or preparation for a new event
                this.selectedShift = {}; // Resets the selectedShift object, clearing any previously selected or edited event data
            }
        },

        // ========================================================================================== //

        changeType(newType) {
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