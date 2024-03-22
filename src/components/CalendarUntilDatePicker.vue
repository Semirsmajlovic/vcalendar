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
                    v-model="formattedCompDate"
                    label="Select Until Date"
                    hint="Choose a date until which the shift is valid"
                    persistent-hint
                    v-bind="attrs"
                    v-on="on"
                    @blur="localDate = compDate"
                    append-icon="mdi-calendar"
                    @click:append="untilMenu = !untilMenu"
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
        const today = new Date();
        const nextYear = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().split('T')[0];
        return {
            dateLocal: "",
            untilMenu: false,
            maxDate: nextYear,
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
        formattedCompDate: {
            get: function() {
                if (!this.compDate) return '';
                // Split the ISO date string into parts
                const [year, month, day] = this.compDate.split('-').map(part => parseInt(part, 10));
                // Create a new Date object using local timezone
                const date = new Date(year, month - 1, day);
                // Format the day with the ordinal indicator
                const dayWithOrdinal = day + this.getOrdinal(day);
                // Use the formatted day with ordinal in the toLocaleDateString options
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                // Replace the day part in the formatted date string with dayWithOrdinal
                let formattedDate = date.toLocaleDateString('en-US', options);
                // Extract the numeric day part from the formatted date for replacement
                const dayPartRegex = new RegExp('\\b' + day + '\\b');
                formattedDate = formattedDate.replace(dayPartRegex, dayWithOrdinal);
                return formattedDate;
            },
            set: function(newValue) {
                // Setter implementation as needed
            }
        },
    },
    methods: {
        toISOFormat(date) {
            if (!date) return null;
            const [month, day, year] = date.split("/");
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
        getOrdinal: function(day) {
            if (day > 3 && day < 21) return 'th';
            switch (day % 10) {
              case 1:  return "st";
              case 2:  return "nd";
              case 3:  return "rd";
              default: return "th";
            }
        },
    },
};
</script>