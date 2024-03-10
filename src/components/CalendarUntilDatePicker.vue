<template>
    <div>
        <v-menu
            ref="untilMenu"
            v-model="untilMenu"
            :close-on-content-click="false"
            :nudge-right="40"
            transition="scale-transition"
            offset-y
            max-width="290px"
            min-width="290px"
        >
            <template v-slot:activator="{ on, attrs }">
                <v-text-field
                    slot="activator"
                    v-model="compDate"
                    label="Until"
                    hint="MM/DD/YYYY"
                    persistent-hint
                    v-bind="attrs"
                    v-on="on"
                    @blur="localDate = compDate"
                ></v-text-field>
            </template>
            <v-date-picker
                v-model="compDate"
                no-title
                :min="minimumEventDate"
                :max="maxDate"
                @input="untilMenu = false"
            ></v-date-picker>
        </v-menu>
    </div>
</template>

<script>
export default {
    name: "CalendarUntilDatePicker",
    props: {
        until: {
            type: String,
            default: "",
        },
        minimumEventDate: {
            type: String,
            default: "",
        },
    },
    data() {
        return {
            dateLocal: "",
            untilMenu: false,
            maxDate: "2025-01-01",
        };
    },
    computed: {
        compDate: {
            get: function () {
                return this.dateLocal || this.toISOFormat(this.until);
            },
            set: function (newValue) {
                this.dateLocal = newValue;
                this.$emit("untilPicked", this.dateLocal);
            },
        },
        localDate: {
            get: function () {
                return this.dateLocal;
            },
            set: function (newValue) {
                this.dateLocal = newValue;
            },
        },
    },
    methods: {
        toISOFormat(date) {
            if (!date) return null;
            const [month, day, year] = date.split("/");
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
    },
};
</script>

<style lang="scss" scoped></style>
