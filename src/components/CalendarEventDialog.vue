<template>
    <v-form ref="form" v-model="valid">
        <v-dialog v-model="eventOpen" persistent max-width="1080">
            <v-card>
                <v-toolbar
                    flat
                    :color="
                        localSelectedEvent.isRecurring ? 'primary' : 'green'
                    "
                    class="white--text mb-6"
                >
                    <v-spacer></v-spacer>
                    <v-toolbar-title>
                        <span class="title--text ml-10">{{
                            formatDateYYYYMMDD(localSelectedEvent.start)
                        }}</span>

                        <span
                            class="font-weight-normal uppercase white--text caption ml-2 labelW"
                        >
                            {{ getWeekdayInitial(selectedWeekdayNum) }}</span
                        >
                    </v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn
                        :color="
                            localSelectedEvent.isRecurring
                                ? 'primary darken-1'
                                : 'green darken-1'
                        "
                        small
                        depressed
                        @click="closeDialog(false)"
                    >
                        <v-icon color="white">mdi-close</v-icon>
                    </v-btn>
                </v-toolbar>

                <calendar-event-dialog-info
                    :event="localSelectedEvent"
                ></calendar-event-dialog-info>

                <v-container>
                    <v-row>
                        <v-col cols="12" sm="6">
                            <span
                                class="font-weight-bold caption uppercase grey--text text--lighten-1"
                                >Names</span
                            >
                            <v-row>
                                <v-col cols="12" sm="6">
                                    <v-text-field
                                        v-model="localSelectedEvent.caregiver"
                                        label="caregiver"
                                        :disabled="
                                            getSelectedPerson.type ===
                                            'caregiver'
                                        "
                                        :rules="rulesName"
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="12" sm="6">
                                    <v-text-field
                                        v-model="localSelectedEvent.client"
                                        label="client"
                                        :disabled="
                                            getSelectedPerson.type === 'client'
                                        "
                                        :rules="rulesName"
                                    ></v-text-field>
                                </v-col>
                            </v-row>
                        </v-col>
                        <v-col cols="12" sm="6">
                            <span
                                class="font-weight-bold caption uppercase grey--text text--lighten-1"
                                >Shift time</span
                            >
                            <calendar-event-time
                                :event="localSelectedEvent"
                                @startTimeChanged="
                                    (...args) => {
                                        changeDTSTARTtime(...args),
                                            changeUNTIL(
                                                ...args,
                                                formatUNTILtoType(
                                                    localUNTIL,
                                                    '-',
                                                    'yyyymmdd'
                                                )
                                            );
                                    }
                                "
                            ></calendar-event-time>
                        </v-col>
                    </v-row>
                </v-container>

                <v-container
                    :class="$vuetify.breakpoint.mdAndUp ? 'heightKeep' : ''"
                    ><!-- set explicit css height to stop dialog height jankiness when toggling recur checkbox on/off-->

                    <v-row v-if="localSelectedEvent.isRecurring || newEvent">
                        <v-col cols="12" sm="1">
                            <v-checkbox
                                v-model="localSelectedEvent.isRecurring"
                                :label="`Recur`"
                                :disabled="
                                    localSelectedEvent.isRecurring && !newEvent
                                "
                            ></v-checkbox>
                        </v-col>
                        <v-col
                            cols="12"
                            sm="11"
                            md="7"
                            v-if="localSelectedEvent.isRecurring"
                        >
                            <v-container>
                                <v-row no-gutters class="mt-n6">
                                    <div
                                        v-for="dayName in weekdayNames"
                                        :key="dayName"
                                    >
                                        <v-col cols="12" sm="1" class="mr-1">
                                            <v-checkbox
                                                multiple
                                                v-model="localBYDAY"
                                                :label="dayName"
                                                :value="dayName"
                                                :rules="rulesCheckBoxMandatory"
                                                @change="
                                                    changeBYDAY(localBYDAY)
                                                "
                                            ></v-checkbox>
                                        </v-col>
                                    </div>
                                </v-row>
                            </v-container>
                        </v-col>

                        <v-col
                            cols="12"
                            sm="12"
                            md="2"
                            v-if="localSelectedEvent.isRecurring"
                        >
                            <v-select
                                v-model="localINTERVAL"
                                :hint="`Interval`"
                                :items="intervalValues"
                                label="Interval"
                                value="localINTERVAL"
                                persistent-hint
                                single-line
                                @change="changeINTERVAL"
                            ></v-select>
                        </v-col>
                        <v-col
                            cols="12"
                            sm="12"
                            md="2"
                            v-if="localSelectedEvent.isRecurring"
                        >
                            <calendar-until-date-picker
                                :until="
                                    formatUNTILtoType(
                                        localUNTIL,
                                        '/',
                                        'mmddyyyy'
                                    )
                                "
                                :minimumEventDate="
                                    formatDateYYYYMMDD(localSelectedEvent.start)
                                "
                                @untilPicked="
                                    (...args) =>
                                        changeUNTIL(
                                            localSelectedEvent.start,
                                            ...args
                                        )
                                "
                            ></calendar-until-date-picker>
                        </v-col>
                    </v-row>
                </v-container>

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
                                    @click="
                                        removeEvent(
                                            localSelectedEvent,
                                            item.action
                                        )
                                    "
                                >
                                    <v-list-item-title>{{
                                        item.title
                                    }}</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </div>
                    <div v-else>
                        <v-btn
                            :disabled="newEvent"
                            text
                            color="orange"
                            @click="removeEvent(localSelectedEvent)"
                        >
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
                    <div
                        v-else-if="!localSelectedEvent.isRecurring && newEvent"
                    >
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
                    <div
                        v-else-if="localSelectedEvent.isRecurring && !newEvent"
                    >
                        <v-menu bottom offset-y>
                            <template v-slot:activator="{ on, attrs }">
                                <v-btn
                                    depressed
                                    :color="
                                        localSelectedEvent.isRecurring
                                            ? 'primary darken-1 white--text'
                                            : 'green darken-1 white--text'
                                    "
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
                                    @click="
                                        patchEvent(
                                            localSelectedEvent,
                                            item.action
                                        )
                                    "
                                >
                                    <v-list-item-title>{{
                                        item.title
                                    }}</v-list-item-title>
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
                            @click="patchEvent(localSelectedEvent)"
                        >
                            Save
                            <v-icon right dark>mdi-content-save</v-icon>
                        </v-btn>
                    </div>
                </v-card-actions>
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
import CalendarEventDialogInfo from "./CalendarEventDialogInfo.vue";

export default {
    components: {
        CalendarEventTime,
        CalendarUntilDatePicker,
        CalendarEventDialogInfo,
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
            valid: false,
            localSelectedEvent: {},
            newEvent: false,
            weekdayNames: ["SU", "MO", "TU", "WE", "TH", "FR", "SA"],
            intervalValues: ["1", "2", "3", "4"],
            localINTERVAL: "",
            localUNTIL: "",
            localBYDAY: [],
            deleteOptions: [
                {
                    title: "Delete this instance",
                    action: "deleteInstance",
                },
                {
                    title: "Delete forward",
                    action: "deleteForward",
                },
                {
                    title: "Delete All",
                    action: "deleteAll",
                },
            ],
            saveOptions: [
                {
                    title: "Update this only",
                    action: "updateInstance",
                },
                {
                    title: "Update forward",
                    action: "updateForward",
                },
                {
                    title: "Update All",
                    action: "updateAll",
                },
            ],
            rulesName: [
                (value) =>
                    !value ||
                    /^[a-zA-Z&-]+\s{1}[a-zA-Z-]+$/.test(value) ||
                    "Names must be 2 words separated by space",
                (value) => !!value || "Required",
            ],
            rulesCheckBoxMandatory: [
                (value) => !value || value.length > 0 || "",
            ],
        };
    },
    computed: {
        ...mapGetters("storeCalendar", [
            "eventOpen",
            "getEventIndex",
            "getSelectedPerson",
            "newEventSignal",
        ]),
    },
    watch: {
        newDay(val, oldVal) {
            // Create a new localSelectedEvent object if newDay prop has properties
            if (this.objectHasProperties(val)) {
                this.createEvent(val);
            }
        },
        selectedEvent(val, oldVal) {
            // Copy selectedEvent prop to localSelectedEvent for existing event
            if (this.objectHasProperties(val)) {
                this.newEvent = false;
                this.localSelectedEvent = val;
            }

            this.localBYDAY = this.getBYDAY(
                this.localSelectedEvent.rruleString
            );

            this.localUNTIL = this.getUNTILstring(
                this.localSelectedEvent.rruleString
            );

            this.localINTERVAL = this.getINTERVALnumber(
                this.localSelectedEvent.rruleString
            );
        },
        localSelectedEvent: {
            deep: true,
            handler(val, oldVal) {
                // When user selects recurring checkbox on a new event create rruleString
                if (this.newEvent && this.localSelectedEvent.isRecurring) {
                    this.localSelectedEvent.rruleString = this.createRRULEString(
                        this.localSelectedEvent
                    );

                    // Re-read INTERVAL string in rruleString after creating rruleString for interval select
                    this.localINTERVAL = this.getINTERVALnumber(
                        this.localSelectedEvent.rruleString
                    );

                    // Re-read UNTIL string in rruleString after creating rruleString for until date picker
                    this.localUNTIL = this.getUNTILstring(
                        this.localSelectedEvent.rruleString
                    );
                }
                // Empty rruleString when user unchecks recurring checkbox
                if (this.newEvent && !this.localSelectedEvent.isRecurring) {
                    this.localSelectedEvent.rruleString = "";
                }
            },
        },
        newEventSignal() {
            // When any CRUD happens, wait for Vuex mutation to set state.newEventSignal=true to update view only after mutation has completed.
            this.$emit("refresh");
            this.SET_NEW_EVENT_SIGNAL(false);
        },
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        ...mapActions("storeCalendar", [
            "dialogOpen",
            "actionCreateNewEvent",
            "updateEvent",
            "deleteEvent",
        ]),
        ...mapMutations("storeCalendar", ["SET_NEW_EVENT_SIGNAL"]),
        objectHasProperties(obj) {
            return Object.keys(obj).length > 0;
        },
        validate() {
            this.$refs.form.validate();
        },
        formatDateYYYYMMDD(date) {
            if (!date) {
                return "";
            }
            return format(parseISO(date), "yyyy-MM-dd");
        },
        createEvent({ date, time, hour, year, weekday }) {
            this.valid = false;
            this.newEvent = true;

            class initEvent {
                constructor(
                    cal_id,
                    caregiver,
                    client,
                    start,
                    end,
                    duration,
                    isRecurring,
                    rruleString
                ) {
                    this.cal_id = cal_id;
                    this.caregiver = caregiver;
                    this.client = client;
                    this.start = start;
                    this.end = end;
                    this.duration = duration;
                    this.isRecurring = false;
                    this.rruleString = "";
                }
            }

            this.localSelectedEvent = new initEvent(
                uuidv4(),
                this.getSelectedPerson.type === "caregiver" &&
                this.getSelectedPerson.name
                    ? this.getSelectedPerson.name
                    : "",
                this.getSelectedPerson.type === "client" &&
                this.getSelectedPerson.name
                    ? this.getSelectedPerson.name
                    : "",
                `${date} 12:00`,
                `${date} 16:00`,
                "4",
                false,
                ""
            );

            this.dialogOpen(true);
        },
        async patchEvent(payload, patchType) {
            if (payload.isRecurring) {
                switch (patchType) {
                    case "updateInstance": {
                        payload.actionType = this.createActionType(
                            "updateInstance",
                            this.originalData
                        );
                        break;
                    }
                    case "updateForward": {
                        payload.actionType = this.createActionType(
                            "updateForward",
                            ""
                        );
                        this.changeDTSTARTdate(payload.start);
                        break;
                    }
                    case "updateAll": {
                        payload.actionType = this.createActionType(
                            "updateAll",
                            ""
                        );
                        break;
                    }
                    default:
                        this.updateSnackMessage(`No actionType in patchEvent`);
                }
            }

            try {
                await this.updateEvent(payload);
                this.updateSnackMessage("Event updated");
            } catch (e) {
                this.updateSnackMessage(`Error ${e}`);
            } finally {
                this.closeDialog();
            }
        },
        async saveNewEvent(payload) {
            try {
                await this.actionCreateNewEvent(payload);
                this.updateSnackMessage("New event created");
            } catch (e) {
                this.updateSnackMessage(`Error ${e}`);
            } finally {
                this.newEvent = false;
                this.closeDialog();
            }
        },
        async removeEvent(payload, removeType) {
            if (payload.isRecurring) {
                switch (removeType) {
                    case "deleteInstance": {
                        payload.actionType = this.createActionType(
                            "deleteInstance",
                            this.originalData
                        );
                        break;
                    }
                    case "deleteForward": {
                        payload.actionType = this.createActionType(
                            "deleteForward",
                            ""
                        );
                        break;
                    }
                    case "deleteAll": {
                        payload.actionType = this.createActionType(
                            "deleteAll",
                            ""
                        );
                        break;
                    }
                    default:
                        this.updateSnackMessage(`No actionType in removeEvent`);
                }
            }

            try {
                await this.deleteEvent(payload);
                this.updateSnackMessage("Event deleted");
            } catch (e) {
                this.updateSnackMessage(`Error ${e}`);
            } finally {
                this.closeDialog();
            }
        },
        closeDialog() {
            this.dialogOpen(false);
        },
        createRRULEString(payload) {
            if (!payload.isRecurring) {
                return "";
            }

            let year = new Date(payload.start).getFullYear();
            let monthUTC = new Date(payload.start).getUTCMonth();
            let day = payload.start.substr(8, 2);
            let hour = payload.start.substr(11, 2);
            let minutes = payload.start.substr(14, 2);

            const rule = new RRule({
                freq: RRule.WEEKLY,
                byweekday:
                    this.localBYDAY.map((dayNames) => RRule[dayNames]) ||
                    this.getWeekdayInitial(
                        new Date(year, monthUTC, day).getDay()
                    ),
                interval: this.localINTERVAL || "1",
                dtstart: new Date(Date.UTC(year, monthUTC, day, hour, minutes)),
                until:
                    this.formatUNTILtoDate(this.localUNTIL) ||
                    new Date(2025, 0, 1),
            });
            return rule.toString();
        },
        getWeekdayInitial(dayNum) {
            return this.weekdayNames[dayNum];
        },
        changeDTSTARTtime(start_time) {
            if (!this.localSelectedEvent.isRecurring) {
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
            // Updating forward requires rruleStringToReplace ( payload.rruleString )'s DTSTART date portion to be updated with date of dateUpdated (payload.start)

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
                return [this.getWeekdayInitial(this.selectedWeekdayNum)];
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
            /**
             * Generic string replace utility function
             *
             * @param {String} s - main String
             * @param {String} subString - target string to replace
             * @param {String} replacement - replacement string
             * @param {String} index - index to start
             *
             */
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
