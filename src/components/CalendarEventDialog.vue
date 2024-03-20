<!-- 
    - Create Shift:
      - Shift Title (Optional): shiftTitle
      - Volunteer Limit: volunteerLimit
      - Driver Limit: driverLimit

      - Recurring
 -->

<template>
    <v-form ref="form" v-model="valid">
        <v-dialog 
            v-model="eventOpen" 
            persistent 
            max-width="720"
            @click:outside="closeDialog(false)"
        >
            <v-card>

                <!-- Start: Toolbar -->
                <v-toolbar>
                    <v-toolbar-title>
                        {{ newEvent ? 'Create Event' : 'Update Event' }}
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn depressed @click="closeDialog(false)">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-toolbar>
                <!-- End: Toolbar -->

                <v-card-text>


                    <v-row no-gutters class="pt-6">
                        <v-col cols="12">
                            <v-text-field
                                v-model="localSelectedEvent.shiftTitle"
                                label="Shift Title (Optional)"
                                hint="Enter a descriptive title for the shift, if desired."
                                type="text"
                                :rules="[v => v.length <= 25 || 'Max 25 characters']"
                            ></v-text-field>
                        </v-col>
                    </v-row>


                    <v-row no-gutters>
                        <v-col cols="12" sm="6" class="pr-6">
                            <v-text-field
                                v-model="localSelectedEvent.volunteerLimit"
                                hint="Provide number of allowed volunteers."
                                label="Volunteer Limit"
                                type="number"
                                :rules="[value => (!isNaN(value) && value >= 0 && value <= 10) || 'The number must be between 0 and 10.']"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <v-text-field
                                v-model="localSelectedEvent.driverHelperLimit"
                                hint="Provide number of allowed drivers and/or helpers."
                                label="Driver / Helper Limit"
                                type="number"
                                :rules="[value => (!isNaN(value) && value >= 0 && value <= 10) || 'The number must be between 0 and 10.']"
                            ></v-text-field>
                        </v-col>
                    </v-row>


                    <calendar-event-time
                        :event="localSelectedEvent"
                        @startTimeChanged="
                            (...args) => {
                                updateRecurringEventStartTime(...args), 
                                changeUNTIL(...args, formatUNTILtoType(localUNTIL, '-', 'yyyymmdd'));
                            }
                        "
                    ></calendar-event-time>


                    <v-row v-if="localSelectedEvent.isRecurring || newEvent" align="start" no-gutters>
                        <v-col cols="12">
                            <span>Choose Shift Type:</span>
                            <v-checkbox
                                class="mt-1"
                                v-model="localSelectedEvent.isRecurring"
                                :label="`Recurring`"
                                :disabled="localSelectedEvent.isRecurring && !newEvent"
                            ></v-checkbox>
                        </v-col>
                    </v-row>


                    <v-expand-transition>
                        <v-row v-if="localSelectedEvent.isRecurring" no-gutters>
                            <div v-for="dayName in weekdayNames" :key="dayName">
                                <v-col cols="12" sm="1" class="mr-1">
                                    <v-checkbox
                                        multiple
                                        v-model="localBYDAY"
                                        :label="dayName"
                                        :value="dayName"
                                        @change="changeBYDAY(localBYDAY)"
                                    ></v-checkbox>
                                </v-col>
                            </div>
                        </v-row>
                    </v-expand-transition>


                    <v-expand-transition>
                        <v-row v-if="localSelectedEvent.isRecurring">
                            <v-col cols="6" sm="6">
                                <v-select
                                    v-model="localINTERVAL"
                                    :items="intervalValues"
                                    label="Recurring Shift Interval"
                                    hint="Select how often the shift recurs. For example, selecting '2' means the shift will recur every 2 weeks."
                                    persistent-hint
                                    single-line
                                    value="localINTERVAL"
                                    @change="changeINTERVAL"
                                    :rules="[v => !!v || 'Interval selection is required']"
                                ></v-select>
                            </v-col>
                            <v-col cols="6" sm="6">
                                <calendar-until-date-picker
                                    :until="formatUNTILtoType(localUNTIL, '/', 'mmddyyyy')"
                                    :minimumEventDate="formatDateYYYYMMDD(localSelectedEvent.start)"
                                    @untilPicked="(...args) => changeUNTIL(localSelectedEvent.start, ...args)"
                                ></calendar-until-date-picker>
                            </v-col>
                        </v-row>
                    </v-expand-transition>


                    <v-row class="mt-3" no-gutters>
                        <v-col cols="12" sm="12">
                            <v-alert outlined dense class="grey lighten-3">
                                <span class="text-body-2 font-weight-bold">Shift Details:</span>
                                <template v-if="localSelectedEvent.isRecurring">
                                    <div class="text-body-2">
                                        Shift start on 
                                        {{ dateStartSentence(localSelectedEvent.rruleString) }}
                                        {{ rruleDescription(localSelectedEvent.rruleString) }}
                                    </div>
                                </template>
                                <template v-else>
                                    <div v-if="localSelectedEvent.hasOwnProperty('actionType')" class="text-body-2">
                                        Single-Occurrence Diverged Shift
                                    </div>
                                    <div v-else class="text-body-2">Single-Occurrence Shift</div>
                                </template>
                            </v-alert>
                        </v-col>
                    </v-row>


                    <v-row justify="center" no-gutters v-if="safeVolunteerNames.length > 0 || safeDriverHelperNames.length > 0">
                        <v-expansion-panels accordion focusable>
                            <v-expansion-panel v-if="safeVolunteerNames.length > 0">
                                <v-expansion-panel-header>Volunteers</v-expansion-panel-header>
                                <v-expansion-panel-content>
                                    <v-data-table
                                        :headers="[{ text: 'Name', value: 'name' }, { text: 'Email', value: 'email' }]"
                                        :items="safeVolunteerNames"
                                        hide-default-footer
                                    ></v-data-table>
                                </v-expansion-panel-content>
                            </v-expansion-panel>
                            <v-expansion-panel v-if="safeDriverHelperNames.length > 0">
                                <v-expansion-panel-header>Driver / Driver Helpers</v-expansion-panel-header>
                                <v-expansion-panel-content>
                                    <v-data-table
                                        :headers="[{ text: 'Name', value: 'name' }, { text: 'Email', value: 'email' }]"
                                        :items="safeDriverHelperNames"
                                        hide-default-footer
                                    ></v-data-table>
                                </v-expansion-panel-content>
                            </v-expansion-panel>
                        </v-expansion-panels>
                    </v-row>


                </v-card-text>


                <!-- Start: Delete / Update / Create Button -->
                <v-card-actions>
                    <div v-if="localSelectedEvent.isRecurring">
                        <v-menu bottom offset-y>
                            <template v-slot:activator="{ on, attrs }">
                                <v-btn
                                    text
                                    color="orange"
                                    :disabled="newEvent"
                                    v-bind="attrs"
                                    v-on="on"
                                >
                                    Delete
                                    <v-icon right dark>
                                        mdi-trash-can-outline
                                    </v-icon>
                                </v-btn>
                            </template>

                            <v-list>
                                <v-list-item 
                                    v-for="(item, index) in deleteOptions" 
                                    :key="index" 
                                    @click="removeEvent(localSelectedEvent, item.action)"
                                >
                                    <v-list-item-title>
                                        {{ item.title }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                    <div v-else>
                        <v-btn :disabled="newEvent" text color="orange" @click="removeEvent(localSelectedEvent)">
                            Delete
                            <v-icon right dark> mdi-trash-can-outline </v-icon>
                        </v-btn>
                    </div>

                    <v-spacer></v-spacer>

                    <!-- Button to create new recurring event -->
                    <div v-if="localSelectedEvent.isRecurring && newEvent">
                        <v-btn
                            :disabled="!valid && newEvent"
                            depressed
                            color="primary darken-1 white--text"
                            @click="saveNewEvent(localSelectedEvent)"
                        >
                            Create
                            <v-icon right dark>mdi-content-save</v-icon>
                        </v-btn>
                    </div>
                
                    <!-- Button to create new onetime event -->
                    <div v-else-if="!localSelectedEvent.isRecurring && newEvent">
                        <v-btn
                            :disabled="!valid && newEvent"
                            depressed
                            color="green darken-1 white--text"
                            @click="saveNewEvent(localSelectedEvent)"
                        >
                            Create
                            <v-icon right dark>mdi-content-save</v-icon>
                        </v-btn>
                    </div>
                    <!-- Button update recurring event in store -->
                    <div v-else-if="localSelectedEvent.isRecurring && !newEvent">
                        <v-menu bottom offset-y>
                            <template v-slot:activator="{ on, attrs }">
                                <v-btn
                                    depressed
                                    :color="localSelectedEvent.isRecurring ? 'primary darken-1 white--text' : 'green darken-1 white--text'"
                                    v-bind="attrs"
                                    v-on="on"
                                    :disabled="!valid"
                                    @click="validate()"
                                >
                                    Save
                                    <v-icon right dark>
                                        mdi-content-save
                                    </v-icon>
                                </v-btn>
                            </template>

                            <v-list>
                                <v-list-item
                                    v-for="(item, index) in saveOptions"
                                    :key="index"
                                    @click="updateRecurringOrSingleShift(localSelectedEvent, item.action)"
                                >
                                    <v-list-item-title>
                                        {{ item.title }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                    <!-- Button to update onetime event in store -->
                    <div v-else>
                        <v-btn
                            :disabled="!valid && newEvent"
                            depressed
                            color="green darken-1 white--text"
                            @click="updateRecurringOrSingleShift(localSelectedEvent)"
                        >
                            Save
                            <v-icon right dark>mdi-content-save</v-icon>
                        </v-btn>
                    </div>
                </v-card-actions>
                <!-- End: Delete / Update / Create Button -->

            </v-card>
        </v-dialog>
    </v-form>
</template>

<script>
import { RRule } from "rrule";
import { mapGetters, mapActions, mapMutations } from "vuex";
import { format, parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import CalendarEventTime from "./CalendarEventTime.vue";
import CalendarUntilDatePicker from "./CalendarUntilDatePicker.vue";

export default {
    components: {
        CalendarEventTime,
        CalendarUntilDatePicker,
    },
    props: {
        selectedEvent: {
            type: Object,
            default() {
                return {};
            },
        },
        newDay: {
            type: Object,
            default() {
                return {};
            },
        },
        selectedWeekdayNum: {
            type: Number,
            default: 0,
        },
        originalData: {
            type: Object,
            default() {
                return {};
            },
        },
    },


    data() {
        return {
            valid: false, // Form validation state
            localSelectedEvent: { // Local state of the event being edited or created
                shiftTitle: "", // Title of the shift/event
                volunteerLimit: 3, // Maximum number of volunteers allowed
                driverHelperLimit: 2 // Maximum number of drivers/helpers allowed
            },
            newEvent: false, // Flag to indicate if a new event is being created
            weekdayNames: ["SU", "MO", "TU", "WE", "TH", "FR", "SA"], // Array of weekday abbreviations for recurrence pattern
            intervalValues: ["1", "2", "3", "4"], // Options for the recurrence interval
            localINTERVAL: "", // Selected recurrence interval
            localUNTIL: "", // Date until which the event recurs
            localBYDAY: [], // Days of the week on which the event recurs
            rruleDescriptionCache: {},
            volunteerNames: [],
            driverHelperNames: [],
            deleteOptions: [ // Options for deleting events
                {
                    title: "Delete this instance", // Option to delete a single instance of a recurring event
                    action: "deleteInstance",
                },
                {
                    title: "Delete forward", // Option to delete this and all future instances of a recurring event
                    action: "deleteForward",
                },
                {
                    title: "Delete All", // Option to delete all instances of a recurring event
                    action: "deleteAll",
                },
            ],
            saveOptions: [ // Options for saving changes to events
                {
                    title: "Update this only", // Option to update only the current instance of a recurring event
                    action: "updateInstance",
                },
                {
                    title: "Update forward", // Option to update this and all future instances of a recurring event
                    action: "updateForward",
                },
                {
                    title: "Update All", // Option to update all instances of a recurring event
                    action: "updateAll",
                },
            ],
        };
    },


    computed: {
        ...mapGetters("storeCalendar", [
            "eventOpen",
            "getIndexEvent",
            "getSelectedParticipant",
            "newEventSignal",
        ]),
        safeVolunteerNames() {
        return this.localSelectedEvent.volunteerNames || [];
        },
        safeDriverHelperNames() {
            return this.localSelectedEvent.driverHelperNames || [];
        }
    },


    watch: {


        newDay(val, oldVal) {
            if (this.objectHasProperties(val)) {
                this.createEvent(val); // Creates a new event using the provided date if the newDay object has properties
            }
        },


        selectedEvent(val, oldVal) {
            // Copy selectedEvent prop to localSelectedEvent for existing event
            if (this.objectHasProperties(val)) {
                this.newEvent = false; // Indicates that an existing event is being edited, not a new one created
                this.localSelectedEvent = val; // Assigns the selected event to the local state for editing
            }

            // Extracts and sets the BYDAY value from the event's RRule string for recurrence pattern
            this.localBYDAY = this.getBYDAY(this.localSelectedEvent.rruleString);

            // Extracts and sets the UNTIL date from the event's RRule string to indicate when recurrence ends
            this.localUNTIL = this.getUNTILstring(this.localSelectedEvent.rruleString);

            // Extracts and sets the INTERVAL number from the event's RRule string to indicate the frequency of recurrence
            this.localINTERVAL = this.getINTERVALnumber(this.localSelectedEvent.rruleString);
        },


        localSelectedEvent: {
            deep: true,
            handler(val, oldVal) {
                if (this.newEvent && this.localSelectedEvent.isRecurring) {
                    // If creating a new recurring event, generate and assign the RRule string
                    this.localSelectedEvent.rruleString = this.createRRULEString(this.localSelectedEvent);
                    // Update the interval based on the newly generated RRule string
                    this.localINTERVAL = this.getINTERVALnumber(this.localSelectedEvent.rruleString);
                    // Update the UNTIL date based on the newly generated RRule string
                    this.localUNTIL = this.getUNTILstring(this.localSelectedEvent.rruleString);
                }
                if (this.newEvent && !this.localSelectedEvent.isRecurring) {
                    // If creating a new non-recurring event, clear the RRule string
                    this.localSelectedEvent.rruleString = "";
                }
            },
        },


        newEventSignal() {
            this.$emit("refresh"); // Emits a "refresh" event to the parent component
            this.SET_NEW_EVENT_SIGNAL(false); // Calls the Vuex mutation to set the new event signal state to false
        },


    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", [
            "adminShiftDialogOpen",
            "actionCreateNewEvent",
            "updateEvent",
            "deleteEvent",
        ]),
        ...mapMutations("storeCalendar", ["SET_NEW_EVENT_SIGNAL"]),


        objectHasProperties(obj) {
            return Object.keys(obj).length > 0; // Checks if the object has any properties (is not empty)
        },


        validate() {
            this.$refs.form.validate(); // Triggers validation on the form referenced by "form"
        },


        formatDateYYYYMMDD(date) {
            if (!date) {
                return ""; // Returns an empty string if no date is provided
            }
            return format(parseISO(date), "yyyy-MM-dd"); // Converts the date to "YYYY-MM-DD" format
        },


        createEvent({ date }) {
            this.valid = false; // Resets form validation state
            this.newEvent = true; // Flags that a new event is being created
            this.localSelectedEvent = {
                shiftTitle: "", // Assigns the shift title to the event
                volunteerLimit: "3", // Assigns the volunteer limit to the event
                volunteerNames: [], // Assigns the volunteer name to the event
                driverHelperLimit: "2", // Assigns the driverHelper limit to the event
                driverHelperNames: [], // Assigns the driverHelper name to the event
                start: `${date} 08:30`, // Sets the event start time to 12:00 on the selected date
                end: `${date} 12:30`, // Sets the event end time to 16:00 on the selected date
                duration: "4", // Sets the event duration to 4 hours
                isRecurring: false, // Flags the event as non-recurring
                rruleString: "" // Initializes an empty string for recurrence rule, used if event becomes recurring
            };
            this.adminShiftDialogOpen(true); // Opens the event dialog to show the event details form
        },


        async updateRecurringOrSingleShift(payload, patchType) {
            if (!payload) {
                console.error("updateRecurringOrSingleShift called without payload");
                this.updateSnackMessage("Error: Missing event data");
                return;
            }
            if (payload.isRecurring) {
                switch (patchType) {
                    case "updateInstance": {
                        payload.actionType = this.createActionType("updateInstance", this.originalData);
                        break;
                    }
                    case "updateForward": {
                        payload.actionType = this.createActionType("updateForward", "");
                        this.changeDTSTARTdate(payload.start);
                        break;
                    }
                    case "updateAll": {
                        payload.actionType = this.createActionType("updateAll", "");
                        break;
                    }
                    default:
                        console.warn(`Invalid patchType: ${patchType}`);
                        this.updateSnackMessage("Invalid action type specified for event update");
                        return;
                }
            }
            try {
                await this.updateEvent(payload);
                this.updateSnackMessage("Event updated");
                console.log("Event successfully updated");
            } catch (e) {
                console.error(`Error updating event: ${e}`);
                this.updateSnackMessage(`Error: ${e.message}`);
            } finally {
                this.closeDialog();
            }
        },


        async saveNewEvent(payload) {
            if (!payload) {
                console.error("saveNewEvent called without payload");
                this.updateSnackMessage("Error: Missing event data");
                return;
            }
            try {
                await this.actionCreateNewEvent(payload);
                this.updateSnackMessage("New event created");
                console.log("New event successfully created");
            } catch (e) {
                console.error(`Error creating new event: ${e}`);
                this.updateSnackMessage(`Error: ${e.message}`);
            } finally {
                this.newEvent = false;
                this.closeDialog();
            }
        },


        async removeEvent(payload, removeType) {
            if (!payload) {
                console.error("removeEvent called without payload");
                this.updateSnackMessage("Error: Missing event data");
                return;
            }
            if (payload.isRecurring) {
                const actionTypeResult = this.determineActionTypeForRecurringEvent(removeType);
                if (actionTypeResult.success) {
                    payload.actionType = actionTypeResult.actionType;
                } else {
                    console.warn(actionTypeResult.message);
                    this.updateSnackMessage(actionTypeResult.message);
                    return;
                }
            }
            try {
                await this.deleteEvent(payload);
                this.updateSnackMessage("Event deleted");
                console.log("Event successfully deleted");
            } catch (e) {
                console.error(`Error deleting event: ${e}`);
                this.updateSnackMessage(`Error: ${e.message}`);
            } finally {
                this.closeDialog();
            }
        },

        determineActionTypeForRecurringEvent(removeType) {
            switch (removeType) {
                case "deleteInstance":
                    return { success: true, actionType: this.createActionType("deleteInstance", this.originalData) };
                case "deleteForward":
                    return { success: true, actionType: this.createActionType("deleteForward", "") };
                case "deleteAll":
                    return { success: true, actionType: this.createActionType("deleteAll", "") };
                default:
                    return { success: false, message: "Invalid removeType specified" };
            }
        },
        
        closeDialog() {
            this.adminShiftDialogOpen(false);
        },


        createRRULEString(payload) {
            if (!payload.isRecurring) {
                console.log("Event is not recurring. No RRULE string generated.");
                return "";
            }
            try {
                const eventStartDate = new Date(payload.start);
                const year = eventStartDate.getFullYear();
                const monthUTC = eventStartDate.getUTCMonth();
                const day = eventStartDate.getDate();
                const hour = eventStartDate.getHours();
                const minutes = eventStartDate.getMinutes();
                const rule = new RRule({
                    freq: RRule.WEEKLY,
                    byweekday: this.localBYDAY.length > 0
                        ? this.localBYDAY.map(dayName => RRule[dayName])
                        : [this.getWeekdayAbbreviationByIndex(eventStartDate.getDay())],
                    interval: parseInt(this.localINTERVAL, 10) || 1,
                    dtstart: new Date(Date.UTC(year, monthUTC, day, hour, minutes)),
                    until: this.formatUNTILtoDate(this.localUNTIL) || new Date(2025, 0, 1),
                });
                return rule.toString();
            } catch (error) {
                console.error("Error generating RRULE string:", error);
                this.updateSnackMessage("Error generating recurrence rule");
                return "";
            }
        },

        /**
         * Retrieves the abbreviation of a weekday based on its index.
         * @param {Number} dayNum - The index of the weekday, where 0 is Sunday, 1 is Monday, etc.
         * @returns {String} The abbreviation of the weekday.
         */
        getWeekdayAbbreviationByIndex(dayNum) {
            return this.weekdayNames[dayNum];
        },

        /**
         * Updates the start time in the DTSTART portion of the RRULE string for a recurring event.
         * @param {String} start_time - The new start time in HH:MM format.
         * Previous: changeDTSTARTtime
         */
        updateRecurringEventStartTime(start_time) {
            if (!this.localSelectedEvent.isRecurring) { // If the shift is not recurring, return.
                return;
            }
            let formatStart = start_time.replace(":", "") + "00";
            let replaceText = this.localSelectedEvent.rruleString.substring(
                17,
                this.localSelectedEvent.rruleString.indexOf("Z")
            );
            this.localSelectedEvent.rruleString = this.replacer(
                this.localSelectedEvent.rruleString,
                replaceText,
                formatStart,
                0
            );
            return;
        },

        changeDTSTARTdate(dateUpdated) {
            if (!this.localSelectedEvent.isRecurring) {
                return;
            }
            let dateForward = dateUpdated.slice(0, 10).replaceAll("-", "");
            let currentDtstartDate = this.localSelectedEvent.rruleString.slice(
                8,
                16
            );
            this.localSelectedEvent.rruleString = this.replacer(
                this.localSelectedEvent.rruleString,
                currentDtstartDate,
                dateForward,
                0
            );
            return;
        },

        getINTERVALnumber(rruleString) {
            if (!rruleString) {
                return;
            }
            let index = rruleString.indexOf("INTERVAL") + 9;
            let endIndex = rruleString.indexOf(";", index);
            return rruleString.substring(index, endIndex);
        },

        changeINTERVAL(interval) {
            let intervalTextCurrent = this.localSelectedEvent.rruleString.substring(
                this.localSelectedEvent.rruleString.indexOf("INTERVAL"),
                this.localSelectedEvent.rruleString.indexOf(
                    ";",
                    this.localSelectedEvent.rruleString.indexOf("INTERVAL")
                )
            );

            let intervalTextNew = `INTERVAL=${interval}`;
            this.localINTERVAL = interval;

            this.localSelectedEvent.rruleString = this.replacer(
                this.localSelectedEvent.rruleString,
                intervalTextCurrent,
                intervalTextNew,
                0
            );
        },
        getBYDAY(rruleString) {
            if (!rruleString) {
                return [this.getWeekdayAbbreviationByIndex(this.selectedWeekdayNum)];
            }

            let index = rruleString.indexOf("BYDAY");
            let startIndex = index + 6;
            let endIndex = rruleString.indexOf(";", startIndex);
            let between = rruleString.substring(startIndex, endIndex);
            return between.split(",");
        },
        changeBYDAY(byDay) {
            if (byDay.length === 0) {
                return;
            }
            let byDayCurrentText = this.localSelectedEvent.rruleString.substring(
                this.localSelectedEvent.rruleString.indexOf("BYDAY"),
                this.localSelectedEvent.rruleString.indexOf(
                    ";",
                    this.localSelectedEvent.rruleString.indexOf("BYDAY")
                )
            );
            let byDayNew = `BYDAY=${byDay.join(",")}`;
            this.localBYDAY = byDay;
            this.localSelectedEvent.rruleString = this.replacer(
                this.localSelectedEvent.rruleString,
                byDayCurrentText,
                byDayNew,
                0
            );
        },
        getUNTILstring(rruleString) {
            if (!rruleString) {
                return "";
            }
            return rruleString.slice(-16);
        },
        formatUNTILtoDate(untilLocal) {
            //Turns rrule until date string into new Date format
            if (!untilLocal) {
                return "";
            }
            let year = untilLocal.slice(0, 4);
            let month = untilLocal.substr(4, 2);
            let day = untilLocal.substr(6, 2);
            return new Date(year, month - 1, day);
        },
        formatUNTILtoType(untilLocal, separator, type) {
            if (!untilLocal) {
                return;
            }
            let year = untilLocal.slice(0, 4);
            let month = untilLocal.substr(4, 2);
            let day = untilLocal.substr(6, 2);

            if (type === "mmddyyyy") {
                // Turns rrule until date string into mm/dd/yyyy format to use in date picker
                return `${month}${separator}${day}${separator}${year}`;
            } else {
                // Used when start time changes
                return `${year}${separator}${month}${separator}${day}`;
            }
        },
        changeUNTIL(startTime, untilDate) {
            if (!untilDate) {
                return;
            }
            let [year, month, day] = untilDate.split("-");
            month = month - 1;

            let untilTime =
                "T" + startTime.slice(-5).replace(":", "").concat("00Z");

            let newUNTILString = format(
                new Date(year, month, day),
                "yyyyMMdd"
            ).concat(untilTime);

            this.localUNTIL = newUNTILString;

            this.localSelectedEvent.rruleString = this.replacer(
                this.localSelectedEvent.rruleString,
                this.localSelectedEvent.rruleString.slice(-16),
                newUNTILString,
                0
            );
        },
        
        replacer(s, subString, replacement, index) {
            const p = s.split(subString, index + 1).join(subString);
            return p.length < s.length
                ? p + replacement + s.slice(p.length + subString.length)
                : s;
        },

        createActionType(aType, ogData) {
            let actionType = {
                description: aType,
                originalData: ogData,
            };

            return actionType;
        },
        showStartTime(startTime) {
            if (!startTime) {
                return;
            }
            return startTime.slice(-5) || "";
        },
        showEndTime(endTime) {
            if (!endTime) {
                return;
            }
            return endTime.slice(-5) || "";
        },

        // ============================================================================================ //

        rruleDescription(ruleString) {
            if (!ruleString) {
                return;
            }
            if (this.rruleDescriptionCache[ruleString]) {
                return this.rruleDescriptionCache[ruleString];
            }
            try {
                const description = RRule.fromString(ruleString).toText();
                this.rruleDescriptionCache[ruleString] = description;
                return description;
            } catch (error) {
                console.error("Error parsing RRULE string:", error);
                return "Invalid RRULE string";
            }
        },

        // ============================================================================================ //

         dateStartSentence(rruleString) {
            if (!rruleString) {
                return '';
            }
            const dtstart = RRule.fromString(rruleString).origOptions.dtstart;
            const day = dtstart.getDate();
            const suffix = ((day) => {
                const j = day % 10,
                    k = day % 100;
                if (j == 1 && k != 11) {
                    return "st";
                }
                if (j == 2 && k != 12) {
                    return "nd";
                }
                if (j == 3 && k != 13) {
                    return "rd";
                }
                return "th";
            })(day);
            const formattedDateWithoutDay = format(dtstart, `MMMM , yyyy`);
            const formattedDate = formattedDateWithoutDay.replace(', ', `${day}${suffix}, `);

            return formattedDate;
        }

        // ============================================================================================ //

    },
};
</script>

<style lang="scss" scoped>
.uppercase {
    text-transform: uppercase;
}

.labelW {
    position: relative;
    top: -1px;
}

.heightKeep {
    height: 120px;
}
</style>
