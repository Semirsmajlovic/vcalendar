<template>
    <v-container>
        <v-row no-gutters>
            <v-col cols="12" sm="2" class="mb-6">
                <div v-if="event.isRecurring">
                    <v-icon color="blue">mdi-calendar-refresh-outline </v-icon>
                    <span class="mr-6 ml-2 blue--text">Recurring Event</span>
                </div>
                <div v-else>
                    <v-icon color="green darken-1">mdi-calendar </v-icon>
                    <span class="mr-8 ml-2 green--text">One time event</span>
                </div>
            </v-col>
            <v-col cols="12" sm="8">
                <span class="mr-2">{{ event.caregiver }}</span>
                <v-icon small class="mb-1 mr-2"> mdi-arrow-right </v-icon>
                <span class="mr-4">{{ event.client }}</span>

                <span class="mr-1">
                    {{ showStartTime(event.start) }}
                    -
                    {{ showEndTime(event.end) }}
                </span>
            </v-col>
        </v-row>
        <v-row no-gutters>
            <v-col cols="12" sm="12">
                <span class="mr-1 grey--text text--darken-2 body-2">
                    <div v-if="event.isRecurring">
                        Starts
                        {{ dateStartSentence(event.rruleString) }}
                        {{ rruleDescription(event.rruleString) }}
                    </div>
                    <div v-else>
                        <div v-if="event.hasOwnProperty('actionType')">
                            Diverged
                        </div>
                        <div v-else>Single</div>
                    </div>
                </span>
            </v-col>
        </v-row></v-container
    >
</template>

<script>
import { RRule } from "rrule";
import { format } from "date-fns";
export default {
    name: "CalendarEventDialogInfo",
    props: {
        event: {
            type: Object,
            default() {
                return {};
            },
        },
    },
    data() {
        return {};
    },
    methods: {
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
        rruleDescription(ruleString) {
            if (!ruleString) {
                return;
            }
            return RRule.fromString(ruleString).toText();
        },
        dateStartSentence(rruleString) {
            if (!rruleString) {
                return;
            }

            return format(
                RRule.fromString(rruleString).origOptions.dtstart,
                "MMM d, yyyy"
            );
        },
    },
};
</script>

<style lang="scss" scoped>
</style>