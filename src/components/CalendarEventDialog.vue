<template>
    <v-form ref="form" v-model="valid">
        <v-dialog 
            v-model="eventOpen" 
            persistent 
            max-width="720"
            @click:outside="adminShiftDialogOpen(false)"
        >
            <v-card>

                <!-- Start: Toolbar -->
                <v-toolbar>
                    <v-toolbar-title>
                        {{ newEvent ? 'Create Event' : 'Update Event' }}
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn depressed @click="adminShiftDialogOpen(false)">
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
                                updateRRULEUntilDateTime(...args, convertUNTILStringToFormattedDate(localUNTIL, '-', 'yyyymmdd'));
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
                                        @change="updateRRULEWeekdays(localBYDAY)"
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
                                    @change="updateRRULEInterval"
                                    :rules="[v => !!v || 'Interval selection is required']"
                                ></v-select>
                            </v-col>
                            <v-col cols="6" sm="6">
                                <calendar-until-date-picker
                                    :until="convertUNTILStringToFormattedDate(localUNTIL, '/', 'mmddyyyy')"
                                    :minimumEventDate="convertDateToISOFormat(localSelectedEvent.start)"
                                    @untilPicked="(...args) => updateRRULEUntilDateTime(localSelectedEvent.start, ...args)"
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
                                        {{ formatDTSTARTDateWithSuffix(localSelectedEvent.rruleString) }}
                                        {{ generateReadableRRULEDescription(localSelectedEvent.rruleString) }}
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
                                    @click="removeShiftAfterDeleteButtonClicked(localSelectedEvent, item.action)"
                                >
                                    <v-list-item-title>
                                        {{ item.title }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                    <div v-else>
                        <v-btn :disabled="newEvent" text color="orange" @click="removeShiftAfterDeleteButtonClicked(localSelectedEvent)">
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
                            @click="createAndSaveNewShift(localSelectedEvent)"
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
                            @click="createAndSaveNewShift(localSelectedEvent)"
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
                                    @click="updateShiftAfterSaveButtonClicked(localSelectedEvent, item.action)"
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
                            @click="updateShiftAfterSaveButtonClicked(localSelectedEvent)"
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
import CalendarEventTime from "./CalendarEventTime.vue";
import CalendarUntilDatePicker from "./CalendarUntilDatePicker.vue";

export default {
    components: {
        CalendarEventTime,
        CalendarUntilDatePicker,
    },
    props: {
        updateLocalStateOnShiftSelectionChange: {
            type: Object,
            default() {
                return {};
            },
        },
        dateForNewShift: {
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
            "emitRefreshAndResetNewEventState",
        ]),
        safeVolunteerNames() {
            return this.localSelectedEvent.volunteerNames || [];
        },
        safeDriverHelperNames() {
            return this.localSelectedEvent.driverHelperNames || [];
        }
    },

    watch: {
        // ===================================================================================== //
        // Watch - Observe and react to data changes.

        // Execution:
        // Step 1: Click on "Calendar Day".
        dateForNewShift(val) {
            if (this.isObjectNotEmpty(val)) {
                this.openAdminShiftDialogAndPopulateDefaultData(val);
                console.log("[CalendarEventDialog.vue/dateForNewShift]: Watch has triggered.");
            }
        },

        // ===================================================================================== //
        // Watch - Observe and react to data changes.

        // Execution:
        // Page Load: Blank Object.
        // Event Click: Returns Shift Object.
        updateLocalStateOnShiftSelectionChange(val) {
            if (this.isObjectNotEmpty(val)) {
                this.newEvent = false;
                this.localSelectedEvent = val;
            }
            this.localBYDAY = this.getBYDAYFromRRULE(this.localSelectedEvent.rruleString);
            this.localUNTIL = this.getUNTILFromDateRRULE(this.localSelectedEvent.rruleString);
            this.localINTERVAL = this.getINTERVALFromRRULE(this.localSelectedEvent.rruleString);
            console.log("[CalendarEventDialog.vue/updateLocalStateOnShiftSelectionChange]: Watch has triggered.", val);
        },

        // ===================================================================================== //
        // Watch - Observe and react to data changes.

        // Execution:
        // Activates when there are changes to the "localSelectedEvent" object.
        // Open "CalendarEventDialog" -> Watch is triggered.
        localSelectedEvent: {
            deep: true,
            handler() {
                try {
                    if (this.newEvent) {
                        if (this.localSelectedEvent.isRecurring) {
                            this.localSelectedEvent.rruleString = this.createRRULEStringDuringShiftCreation(this.localSelectedEvent);
                            this.localINTERVAL = this.getINTERVALFromRRULE(this.localSelectedEvent.rruleString);
                            this.localUNTIL = this.getUNTILFromDateRRULE(this.localSelectedEvent.rruleString);
                            console.log("[CalendarEventDialog.vue/updateRRULEForShift]: RRULE for shift updated as the shift is recurring.");
                        } else {
                            this.localSelectedEvent.rruleString = "";
                            console.log("[CalendarEventDialog.vue/updateRRULEForShift]: RRULE for shift cleared as the shift is not recurring.");
                        }
                    }
                } catch (error) {
                    console.error("[CalendarEventDialog.vue/updateRRULEForShift]: Error updating RRULE for shift:", error);
                }
            },
        },

        // ===================================================================================== //
        // Watch - Observe and react to data changes.

        // Execution:
        // Keeps watch for changes, to refresh state management.
        emitRefreshAndResetNewEventState() {
            this.$emit("refresh");
            this.SET_NEW_EVENT_SIGNAL(false);
        },

        // ===================================================================================== //
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

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        isObjectNotEmpty(obj) {
            const hasProperties = Object.keys(obj).length > 0;
            console.log(`[CalendarEventDialog.vue/isObjectNotEmpty]: Object has properties: ${hasProperties}`);
            return hasProperties;
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        convertDateToISOFormat(date) {
            if (!date) {
                console.log("[CalendarEventDialog.vue/convertDateToISOFormat]: No date provided.");
                return "";
            }
            try {
                const formattedDate = format(parseISO(date), "yyyy-MM-dd"); // Converts the date to "YYYY-MM-DD" format
                console.log("[CalendarEventDialog.vue/convertDateToISOFormat]: Date converted to ISO format successfully.");
                return formattedDate;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/convertDateToISOFormat]: Error converting date to ISO format: ${error}`);
                return "";
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // Step 2: dateForNewShift -> This method triggers after.
        openAdminShiftDialogAndPopulateDefaultData({ date }) {
            try {
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
                console.log("[CalendarEventDialog.vue/openAdminShiftDialogAndPopulateDefaultData]: Admin shift dialog opened successfully with default data populated.");
            } catch (error) {
                console.error("[CalendarEventDialog.vue/openAdminShiftDialogAndPopulateDefaultData]: Error opening admin shift dialog and populating default data:", error);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // Step 1: Open "Admin Shift Dialog" -> Click "Save" -> Method is triggered.
        async updateShiftAfterSaveButtonClicked(payload, patchType) {
            if (payload.isRecurring) {
                const actionTypeMap = {
                    updateInstance: () => this.generateActionTypeObject("updateInstance", this.originalData),
                    updateForward: () => {
                        const actionType = this.generateActionTypeObject("updateForward", "");
                        this.updateRecurringEventStartDate(payload.start);
                        return actionType;
                    },
                    updateAll: () => this.generateActionTypeObject("updateAll", "")
                };
                payload.actionType = actionTypeMap[patchType] ? actionTypeMap[patchType]() : this.updateSnackMessage(`No actionType in updateShiftAfterSaveButtonClicked`);
            }
            try {
                await this.updateEvent(payload);
                this.updateSnackMessage("Shift updated successfully.");
                console.log("[CalendarEventDialog.vue/updateShiftAfterSaveButtonClicked]: Shift updated successfully:", payload);
            } catch (e) {
                console.error("[CalendarEventDialog.vue/updateShiftAfterSaveButtonClicked]: Error updating shift:", e);
                this.updateSnackMessage(`Error updating shift: ${e.message}`);
            } finally {
                this.adminShiftDialogOpen(false);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Step 1: User clicks on "Create" -> This method is triggered.
        async createAndSaveNewShift(payload) {
            try {
                await this.actionCreateNewEvent(payload);
                this.updateSnackMessage("New shift created");
                console.log("[CalendarEventDialog.vue/createAndSaveNewShift]: New shift created successfully.");
            } catch (e) {
                console.error(`[CalendarEventDialog.vue/createAndSaveNewShift]: Error creating new shift: ${e}`);
                this.updateSnackMessage(`Error creating new shift: ${e.message}`);
            } finally {
                this.newEvent = false;
                this.adminShiftDialogOpen(false);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Step 1: User clicks on "Delete" -> This method is triggered.
        async removeShiftAfterDeleteButtonClicked(payload, removeType) {
            if (payload.isRecurring && removeType) {
                try {
                    const actionType = this.generateActionTypeObject(
                        removeType === 'deleteInstance' ? 'deleteInstance' :
                        removeType === 'deleteForward' ? 'deleteForward' :
                        removeType === 'deleteAll' ? 'deleteAll' : '',
                        removeType === 'deleteInstance' ? this.originalData : ''
                    );
                    if (actionType.description) {
                        payload.actionType = actionType;
                    } else {
                        this.updateSnackMessage(`No actionType in removeShiftAfterDeleteButtonClicked`);
                        console.error(`[CalendarEventDialog.vue/removeShiftAfterDeleteButtonClicked]: Invalid removeType: ${removeType}`);
                        return;
                    }
                } catch (error) {
                    console.error(`[CalendarEventDialog.vue/removeShiftAfterDeleteButtonClicked]: Error setting actionType in removeShiftAfterDeleteButtonClicked: ${error}`);
                    this.updateSnackMessage(`Error setting actionType: ${error.message}`);
                    return;
                }
            }
            try {
                await this.deleteEvent(payload);
                this.updateSnackMessage("Shift deleted.");
                console.log("[CalendarEventDialog.vue/removeShiftAfterDeleteButtonClicked]: Shift successfully deleted:", payload);
            } catch (e) {
                console.error(`[CalendarEventDialog.vue/removeShiftAfterDeleteButtonClicked]: Error deleting shift: ${e}`);
                this.updateSnackMessage(`Error deleting shift: ${e.message}`);
            } finally {
                this.adminShiftDialogOpen(false);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Step 1: Create Shift -> Update "Recurring" Section.
        createRRULEStringDuringShiftCreation(payload) {
            if (!payload.isRecurring) {
                return "";
            }
            try {
                const startDate = new Date(payload.start);
                const year = startDate.getFullYear();
                const monthUTC = startDate.getUTCMonth();
                const day = startDate.getDate();
                const hour = startDate.getHours();
                const minutes = startDate.getMinutes();
                const byweekday = this.localBYDAY.length > 0
                    ? this.localBYDAY.map(dayName => RRule[dayName.toUpperCase()])
                    : [this.getWeekdayAbbreviationByIndex(startDate.getDay())];
                const rule = new RRule({
                    freq: RRule.WEEKLY,
                    byweekday,
                    interval: parseInt(this.localINTERVAL, 10) || 1,
                    dtstart: new Date(Date.UTC(year, monthUTC, day, hour, minutes)),
                    until: this.convertUNTILStringToDate(this.localUNTIL) || new Date(2025, 0, 1),
                });
                console.log("[CalendarEventDialog.vue/createRRULEStringDuringShiftCreation]: Created RRule string: ", rule.toString());
                return rule.toString();
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/createRRULEStringDuringShiftCreation]: Error creating RRULE string: ${error}`);
                return "";
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Notes:
        // The method getWeekdayAbbreviationByIndex is called to convert a numeric day index into its corresponding weekday abbreviation within the component.

        // Execution:
        // N/A
        getWeekdayAbbreviationByIndex(dayNum) {
            if (typeof dayNum !== 'number' || dayNum < 0 || dayNum >= this.weekdayNames.length) {
                console.error("[CalendarEventDialog.vue/getWeekdayAbbreviationByIndex]: Invalid dayNum argument", dayNum);
                return '';
            }
            try {
                return this.weekdayNames[dayNum];
            } catch (error) {
                console.error("[CalendarEventDialog.vue/getWeekdayAbbreviationByIndex]: Error accessing weekdayNames with dayNum", dayNum, error);
                return '';
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Notes:
        // Updates the start time in the DTSTART portion of the RRULE string for a recurring event.

        // Previous: changeDTSTARTtime()

        // Execution:
        // Click "Create/Update Shift" -> Change "Start Time".
        updateRecurringEventStartTime(start_time) {
            if (!this.localSelectedEvent.isRecurring) {
                console.log("[CalendarEventDialog.vue/updateRecurringEventStartTime]: The shift is not recurring. Exiting method.");
                return;
            }
            try {
                let formatStart = start_time.replace(":", "") + "00";
                let rruleString = this.localSelectedEvent.rruleString;
                let dtStartIndex = rruleString.indexOf("DTSTART");
                if (dtStartIndex === -1) {
                    throw new Error("DTSTART not found in RRULE string.");
                }
                let zuluIndex = rruleString.indexOf("Z", dtStartIndex);
                if (zuluIndex === -1) {
                    throw new Error("Zulu time indicator (Z) not found in RRULE string after DTSTART.");
                }
                let replaceText = rruleString.substring(dtStartIndex + 17, zuluIndex);
                this.localSelectedEvent.rruleString = this.replaceSubstringAtIndex(rruleString, replaceText, formatStart, 0);
                console.log("[CalendarEventDialog.vue/updateRecurringEventStartTime]: Successfully updated RRULE string.");
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/updateRecurringEventStartTime]: Error updating RRULE string: ${error.message}`);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Recurring Event" -> Change RRule -> Click "Save -> Update forward" -> Method is triggered.
        updateRecurringEventStartDate(dateUpdated) {
            if (!this.localSelectedEvent.isRecurring) {
                console.log("[CalendarEventDialog.vue/updateRecurringEventStartDate]: The shift is not recurring. Exiting method.");
                return;
            }
            try {
                let dateForward = dateUpdated.slice(0, 10).replaceAll("-", "");
                let rruleString = this.localSelectedEvent.rruleString;
                let dtStartIndex = rruleString.indexOf("DTSTART");
                if (dtStartIndex === -1) {
                    throw new Error("DTSTART not found in RRULE string.");
                }
                let dateStartIndex = dtStartIndex + 8;
                let dateEndIndex = rruleString.indexOf("T", dateStartIndex);
                if (dateEndIndex === -1) {
                    throw new Error("Time (T) not found in RRULE string after DTSTART date.");
                }
                let currentDtstartDate = rruleString.substring(dateStartIndex, dateEndIndex);
                this.localSelectedEvent.rruleString = this.replaceSubstringAtIndex(rruleString, currentDtstartDate, dateForward, 0);
                console.log("[CalendarEventDialog.vue/updateRecurringEventStartDate]: Successfully updated DTSTART date in RRULE string.");
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/updateRecurringEventStartDate]: Error updating DTSTART date in RRULE string: ${error.message}`);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Shift" Dialog.
        getINTERVALFromRRULE(rruleString) {
            if (!rruleString) {
                console.log("[CalendarEventDialog.vue/getINTERVALFromRRULE]: No RRULE string provided.");
                return;
            }
            try {
                let index = rruleString.indexOf("INTERVAL") + 9; // Start after 'INTERVAL='
                let endIndex = rruleString.indexOf(";", index);
                if (index === 8 || endIndex === -1) { // If 'INTERVAL=' not found, or ';' not found after 'INTERVAL='
                    throw new Error("INTERVAL not found or malformed in RRULE string.");
                }
                console.log("[CalendarEventDialog.vue/getINTERVALFromRRULE]: Successfully extracted INTERVAL from RRULE string.");
                return rruleString.substring(index, endIndex);
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/getINTERVALFromRRULE]: Error extracting INTERVAL number: ${error.message}`);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Recurring" Shift -> Update "Internal" field.
        updateRRULEInterval(interval) {
            if (!this.localSelectedEvent.rruleString) {
                console.log("[CalendarEventDialog.vue/updateRRULEInterval]: No RRULE string available in the selected event.");
                return;
            }
            try {
                const rruleString = this.localSelectedEvent.rruleString;
                const intervalIndex = rruleString.indexOf("INTERVAL");
                if (intervalIndex === -1) {
                    throw new Error("INTERVAL part not found in RRULE string.");
                }
                const intervalEndIndex = rruleString.indexOf(";", intervalIndex);
                const intervalTextCurrent = rruleString.substring(intervalIndex, intervalEndIndex !== -1 ? intervalEndIndex : undefined);
                const intervalTextNew = `INTERVAL=${interval}`;
                this.localINTERVAL = interval;
                this.localSelectedEvent.rruleString = this.replaceSubstringAtIndex(
                    rruleString,
                    intervalTextCurrent,
                    intervalTextNew,
                    0
                );
                console.log("[CalendarEventDialog.vue/updateRRULEInterval]: Successfully updated INTERVAL in RRULE string.");
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/updateRRULEInterval]: Error updating INTERVAL in RRULE string: ${error.message}`);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Shift" Dialog.
        getBYDAYFromRRULE(rruleString) {
            if (!rruleString) {
                console.log("[CalendarEventDialog.vue/getBYDAYFromRRULE]: No RRULE string provided. Using selected weekday number.");
                return [this.getWeekdayAbbreviationByIndex(this.selectedWeekdayNum)];
            }
            try {
                const index = rruleString.indexOf("BYDAY");
                if (index === -1) {
                    throw new Error("BYDAY part not found in RRULE string.");
                }
                const startIndex = index + 6; // "BYDAY=" length is 6, so we start right after
                const endIndex = rruleString.indexOf(";", startIndex);
                if (endIndex === -1) {
                    throw new Error("Semicolon not found after BYDAY in RRULE string.");
                }
                const byDayList = rruleString.substring(startIndex, endIndex).split(",");
                console.log("[CalendarEventDialog.vue/getBYDAYFromRRULE]: Successfully extracted BYDAY from RRULE string.");
                return byDayList;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/getBYDAYFromRRULE]: Error extracting BYDAY from RRULE string: ${error.message}`);
                return [];
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Recurring" Shift -> Update "Days" field.
        updateRRULEWeekdays(byDay) {
            if (!this.localSelectedEvent.rruleString) {
                console.log("[CalendarEventDialog.vue/updateRRULEWeekdays]: No RRULE string available in the selected event.");
                return;
            }
            if (byDay.length === 0) {
                console.log("[CalendarEventDialog.vue/updateRRULEWeekdays]: Empty BYDAY array provided. No update performed.");
                return;
            }
            try {
                const byDayCurrentTextStartIndex = this.localSelectedEvent.rruleString.indexOf("BYDAY");
                if (byDayCurrentTextStartIndex === -1) {
                    throw new Error("BYDAY part not found in RRULE string.");
                }
                const byDayCurrentTextEndIndex = this.localSelectedEvent.rruleString.indexOf(";", byDayCurrentTextStartIndex);
                const byDayCurrentText = this.localSelectedEvent.rruleString.substring(
                    byDayCurrentTextStartIndex,
                    byDayCurrentTextEndIndex !== -1 ? byDayCurrentTextEndIndex : undefined
                );
                const byDayNew = `BYDAY=${byDay.join(",")}`;
                this.localBYDAY = byDay;
                this.localSelectedEvent.rruleString = this.replaceSubstringAtIndex(
                    this.localSelectedEvent.rruleString,
                    byDayCurrentText,
                    byDayNew,
                    0
                );
                console.log("[CalendarEventDialog.vue/updateRRULEWeekdays]: Successfully updated BYDAY in RRULE string.");
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/updateRRULEWeekdays]: Error updating BYDAY in RRULE string: ${error.message}`);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Shift" Dialog.
        getUNTILFromDateRRULE(rruleString) {
            if (!rruleString) {
                console.log("[CalendarEventDialog.vue/getUNTILFromDateRRULE]: No RRULE string provided.");
                return "";
            }
            try {
                const untilIndex = rruleString.indexOf("UNTIL");
                if (untilIndex === -1) {
                    throw new Error("UNTIL part not found in RRULE string.");
                }
                const untilString = rruleString.slice(-16);
                console.log("[CalendarEventDialog.vue/getUNTILFromDateRRULE]: Successfully extracted UNTIL date from RRULE string.");
                return untilString;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/getUNTILFromDateRRULE]: Error extracting UNTIL date from RRULE string: ${error.message}`);
                return "";
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Shift" Dialog -> Click "Recurring" Checkbox.
        convertUNTILStringToDate(untilLocal) {
            if (!untilLocal) {
                console.log("[CalendarEventDialog.vue/convertUNTILStringToDate]: No UNTIL string provided.");
                return "";
            }
            try {
                let year = untilLocal.slice(0, 4);
                let month = untilLocal.substr(4, 2);
                let day = untilLocal.substr(6, 2);
                let date = new Date(year, month - 1, day);
                if (isNaN(date.getTime())) {
                    throw new Error("Invalid date format.");
                }
                console.log("[CalendarEventDialog.vue/convertUNTILStringToDate]: Successfully converted UNTIL string to Date.");
                return date;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/convertUNTILStringToDate]: Error converting UNTIL string to Date: ${error.message}`);
                return "";
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Shift" Dialog -> Click "Recurring" Checkbox.
        convertUNTILStringToFormattedDate(untilLocal, separator, type) {
            if (!untilLocal) {
                console.log("[CalendarEventDialog.vue/convertUNTILStringToFormattedDate]: No UNTIL string provided.");
                return "";
            }
            try {
                let year = untilLocal.slice(0, 4);
                let month = untilLocal.substr(4, 2);
                let day = untilLocal.substr(6, 2);
                let formattedDate;
                if (type === "mmddyyyy") {
                    // Turns rrule until date string into mm/dd/yyyy format to use in date picker
                    formattedDate = `${month}${separator}${day}${separator}${year}`;
                } else {
                    // Default format: yyyy-mm-dd or a variation based on the separator
                    formattedDate = `${year}${separator}${month}${separator}${day}`;
                }
                console.log(`[CalendarEventDialog.vue/convertUNTILStringToFormattedDate]: Successfully converted UNTIL string to ${type} format.`);
                return formattedDate;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/convertUNTILStringToFormattedDate]: Error converting UNTIL string to formatted date: ${error.message}`);
                return "";
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        // Execution:
        // - Open "Shift" Dialog -> Click "Recurring" Checkbox -> Update "Select Until Date".
        updateRRULEUntilDateTime(startTime, untilDate) {
            if (!untilDate) {
                console.log("[CalendarEventDialog.vue/updateRRULEUntilDateTime]: No untilDate provided.");
                return;
            }
            try {
                let [year, month, day] = untilDate.split("-");
                month = month - 1;
                let untilTime = "T" + startTime.slice(-5).replace(":", "") + "00Z";
                let newUNTILString = format(new Date(year, month, day), "yyyyMMdd") + untilTime;
                this.localUNTIL = newUNTILString;
                this.localSelectedEvent.rruleString = this.replaceSubstringAtIndex(
                    this.localSelectedEvent.rruleString,
                    this.localSelectedEvent.rruleString.slice(-16),
                    newUNTILString,
                    0
                );
                console.log("[CalendarEventDialog.vue/updateRRULEUntilDateTime]: Successfully updated UNTIL in RRULE string.");
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/updateRRULEUntilDateTime]: Error updating UNTIL in RRULE string: ${error.message}`);
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        replaceSubstringAtIndex(s, subString, replacement, index) {
            const p = s.split(subString, index + 1).join(subString);
            return p.length < s.length
                ? p + replacement + s.slice(p.length + subString.length)
                : s;
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        generateActionTypeObject(actionDescription, originalData) {
            try {
                if (typeof actionDescription !== 'string') {
                    throw new Error("Action description must be a string.");
                }
                const actionTypeObject = {
                    description: actionDescription,
                    originalData: originalData,
                };
                console.log("[CalendarEventDialog.vue/generateActionTypeObject]: Action type object created successfully.");
                return actionTypeObject;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/generateActionTypeObject]: Error creating action type object: ${error.message}`);
                return null;
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        generateReadableRRULEDescription(ruleString) {
            if (!ruleString) {
                console.log("[CalendarEventDialog.vue/generateReadableRRULEDescription]: No RRULE string provided.");
                return "";
            }
            if (this.rruleDescriptionCache[ruleString]) {
                console.log("[CalendarEventDialog.vue/generateReadableRRULEDescription]: Returning cached description.");
                return this.rruleDescriptionCache[ruleString];
            }
            try {
                const description = RRule.fromString(ruleString).toText();
                this.rruleDescriptionCache[ruleString] = description;
                console.log("[CalendarEventDialog.vue/generateReadableRRULEDescription]: RRULE description generated successfully.");
                return description;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/generateReadableRRULEDescription]: Error parsing RRULE string: ${error}`);
                return "Invalid RRULE string";
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        formatDTSTARTDateWithSuffix(rruleString) {
            if (!rruleString) {
                console.log("[CalendarEventDialog.vue/formatDTSTARTDateWithSuffix]: No RRULE string provided.");
                return '';
            }
            try {
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
                console.log("[CalendarEventDialog.vue/formatDTSTARTDateWithSuffix]: DTSTART date formatted successfully.");
                return formattedDate;
            } catch (error) {
                console.error(`[CalendarEventDialog.vue/formatDTSTARTDateWithSuffix]: Error formatting DTSTART date: ${error}`);
                return "";
            }
        },

        // ===================================================================================== //
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