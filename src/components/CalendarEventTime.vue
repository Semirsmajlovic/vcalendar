<template>
    <v-row>
        <v-col cols="4">
            <v-menu
                ref="menu"
                v-model="menu_start"
                :close-on-content-click="false"
                :nudge-right="40"
                :return-value.sync="compuStart"
                transition="scale-transition"
                offset-y
                max-width="290px"
                min-width="290px"
            >
                <template v-slot:activator="{ on, attrs }">
                    <v-text-field
                        v-model="compuStart"
                        label="Start Time"
                        readonly
                        v-bind="attrs"
                        v-on="on"
                    ></v-text-field>
                </template>
                <v-time-picker
                    format="24hr"
                    :allowed-minutes="allowedStep"
                    v-if="menu_start"
                    v-model="compuStart"
                    full-width
                    @click:minute="$refs.menu.save(compuStart)"
                ></v-time-picker>
            </v-menu>
        </v-col>
        <v-col cols="4">
            <v-text-field
                label="Duration"
                v-model="compuDur"
                @blur="duration = compuDur"
                :rules="rulesDuration"
            ></v-text-field>
        </v-col>
        <v-col cols="4">
            <v-text-field
                v-model="compuEnd"
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
                // This variable keeps the current duration since changing event.start will automatically change the duration based on input
                let tmpDur = this.compuDur;
                this.event.start = this.formatFull(setTime, "start");

                // Set the duration back to original duration before changing start time
                this.compuDur = tmpDur;

                // Emit change of start time to main dialog component to change DTSTART
                this.$emit("startTimeChanged", setTime);
            },
        },
        compuDur: {
            get: function () {
                let diffMinutes = Math.abs(
                    differenceInMinutes(
                        parseISO(this.event.start),
                        parseISO(this.event.end)
                    )
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
                this.event.end = format(
                    addMinutes(parseISO(this.event.start), minutesToAdd),
                    "yyyy-MM-dd HH:mm"
                );
            },
        },
    },
    watch: {
        start_time(val) {
            this.event.start = this.formatFull(this.start_time, "start");
        },
    },
    methods: {
        timeOnly(time) {
            if (!time) return "00:00";
            return time.slice(11);
        },
        displayDate(date) {
            if (!date) {
                return "";
            }
            return date.substring(0, 10);
        },
        formatFull(time, startOrEnd) {
            if (!time || !startOrEnd) return null;
            let date =
                startOrEnd === "start"
                    ? this.event.start.substring(0, 10)
                    : this.event.end.substring(0, 10);
            return `${date} ${time}`;
        },
        allowedStep: (m) => m % 15 === 0,
    },
};
</script>

<style lang="scss" scoped>
</style>
