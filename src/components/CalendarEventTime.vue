<template>
    <v-row>
        <v-col cols="4">
            <v-dialog
                ref="dialog"
                v-model="menu_start"
                :return-value.sync="compuStart"
                persistent
                width="290px"
            >
                <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                        :value="formattedCompuStart"
                        label="Start Time"
                        readonly
                        v-bind="attrs"
                        v-on="on"
                    ></v-text-field>
                </template>
                <v-time-picker
                    :allowed-minutes="allowedStep"
                    v-if="menu_start"
                    v-model="compuStart"
                    format="ampm"
                    @click:minute="$refs.menu.save(compuStart)"
                    use-ampm
                    full-width
                >
                    <v-spacer></v-spacer>
                    <v-btn
                        text
                        color="primary"
                        @click="menu_start = false"
                    >
                        Cancel
                    </v-btn>
                    <v-btn
                        text
                        color="primary"
                        @click="$refs.dialog.save(compuStart); menu_start = false"
                    >
                        OK
                    </v-btn>
                </v-time-picker>
            </v-dialog>
        </v-col>
        <v-col cols="4">
            <v-text-field
                label="Shift Duration"
                v-model="compuDur"
                hint="Example: 4.25 (4 Hours, 15 Minutes)"
                @blur="duration = compuDur"
                :rules="rulesDuration"
            ></v-text-field>
        </v-col>
        <v-col cols="4">
            <v-text-field
                :value="formattedCompuEnd"
                label="End time"
                disabled
            ></v-text-field>
        </v-col>
    </v-row>
</template>

<script>
import { format, parseISO, addMinutes, differenceInMinutes } from "date-fns";
export default {
    name: "CalendarEventTime",
    props: {
        event: {
            type: Object,
            default() {
                return {};
            },
        },
    },
    data() {
        return {
            start_time: "",
            menu_start: false,
            rulesDuration: [
                (value) => !!value || "Required",
                (value) => !value || value <= 24 || "Maximum 24",
                (value) =>
                    !value ||
                    /^\s*(?=.*[1-9])\d+(\.(?:0|00|25|5|50|75))?$/.test(value) ||
                    "Ranges 0.25 to 24 in 0.25 increments",
            ],
        };
    },
    computed: {
        compuStart: {
            get: function (getTime) {
                return this.timeOnly(this.event.start);
            },
            set: function (setTime) {
                let tmpDur = this.compuDur;
                this.event.start = this.formatFull(setTime, "start");
                this.compuDur = tmpDur;
                this.$emit("startTimeChanged", setTime);
            },
        },
        compuDur: {
            get: function () {
                let diffMinutes = Math.abs(
                    differenceInMinutes(parseISO(this.event.start), parseISO(this.event.end))
                );
                let durationInHours = diffMinutes / 60;
                return durationInHours;
            },
            set: function (dur) {
                let tmpDur = this.compuDur;
                let checkDurationFormat = /^\s*(?=.*[1-9])\d+(\.(?:0|00|25|5|50|75))?$/;
                let durationFormatPass = checkDurationFormat.test(dur);
                if (durationFormatPass) {
                    this.event.duration = dur;
                    let durationInMinutes = dur * 60;
                    this.compuEnd = durationInMinutes;
                } else {
                    this.event.duration = tmpDur;
                }
            },
        },
        compuEnd: {
            get: function (getTime) {
                return this.timeOnly(this.event.end);
            },
            set: function (minutesToAdd) {
                if (isNaN(minutesToAdd)) {
                    return;
                }
                let endDate = this.displayDate(this.event.start);
                this.event.end = format(addMinutes(parseISO(this.event.start), minutesToAdd),"yyyy-MM-dd HH:mm");
            },
        },
        formattedCompuStart: {
            get() {
                // Assuming compuStart is in 'HH:mm' format (24-hour format)
                if (!this.compuStart) return '';
                let [hour, minute] = this.compuStart.split(':');
                const h = parseInt(hour, 10);
                const ampm = h >= 12 ? 'PM' : 'AM';
                hour = h % 12;
                hour = hour ? hour : 12; // Convert '0' hour to '12'
                minute = parseInt(minute, 10); // Remove any leading zeros

                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
            },
            set(value) {
                // The setter is not needed for display purposes only
            }
        },
        formattedCompuEnd: {
            get() {
                // Assuming compuEnd is in 'HH:mm' format (24-hour format)
                if (!this.compuEnd) return '';
                let [hour, minute] = this.compuEnd.split(':');
                const h = parseInt(hour, 10);
                const ampm = h >= 12 ? 'PM' : 'AM';
                hour = h % 12;
                hour = hour ? hour : 12; // Convert '0' hour to '12'
                minute = parseInt(minute, 10); // Remove any leading zeros

                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
            },
            set(value) {
                // The setter is not needed for display purposes only
            }
        }
    },
    watch: {
        start_time(val) {
            this.event.start = this.formatFull(this.start_time, "start");
        },
    },
    methods: {
        timeOnly(time) {
            if (!time) {
                return "00:00";
            }
            return time.slice(11);
        },
        displayDate(date) {
            if (!date) {
                return "";
            }
            return date.substring(0, 10);
        },
        formatFull(time, startOrEnd) {
            if (!time || !startOrEnd) {
                return null;
            }
            let date = startOrEnd === "start" ? this.event.start.substring(0, 10) : this.event.end.substring(0, 10);
            return `${date} ${time}`;
        },
        allowedStep: (m) => m % 15 === 0,
    },
};
</script>