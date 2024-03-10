<template>
    <v-container>
        <v-row class="fill-height">
            <v-col>
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

                <v-container>
                    <v-row>
                        <v-col cols="12" lg="10" id="calendarContent">
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
                                :events="events"
                                :event-height="100"
                                :events-more="false"
                                :show-week="true"
                                @click:event="showEvent"
                                @click:date="createEvent"
                                @click:day="createEvent"
                                @change="refreshEvents"
                            >
                                <template v-slot:event="{ event }">
                                    <calendar-day :event="event"></calendar-day>
                                </template>
                            </v-calendar>
                        </v-col>
                        <v-col cols="12" lg="2">
                            <calendar-side-bar
                                @selectedPerson="refreshEvents()"
                                :focus="focus"
                            >
                            </calendar-side-bar>
                        </v-col>
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
    </v-container>
</template>

<script>
import { mapGetters, mapActions, mapMutations } from "vuex";
import CalendarDay from "./CalendarDay.vue";
import CalendarToolBar from "./CalendarToolBar.vue";
import CalendarSideBar from "./CalendarSideBar.vue";
import CalendarEventDialog from "./CalendarEventDialog.vue";

export default {
    name: "Calendar",
    components: {
        CalendarDay,
        CalendarToolBar,
        CalendarSideBar,
        CalendarEventDialog,
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
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", ["initInstances", "dialogOpen"]),
        viewToday() {
            this.focus = "";
        },
        createEvent(day) {
            this.selectedWeekdayNum = day.weekday;
            this.selectedEvent = {};
            this.originalData = {};
            this.newDay = day;
            this.dialogOpen(true);
        },
        showEvent({ nativeEvent, event, eventParsed }) {
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
    },
};
</script>

<style lang="scss" scoped>
/*
FIX
Fix for multiple events in one day by stretching height
https://github.com/vuetifyjs/vuetify/issues/9796
*/
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