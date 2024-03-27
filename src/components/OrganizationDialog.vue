<template>
    <v-dialog v-model="dialog" persistent max-width="600px" @click:outside="dialog = false">
        <v-card>
            <v-card-title>
            Organization Details
            </v-card-title>
            <v-card-text>
                <v-form ref="form" v-model="formValid">
                    <v-text-field 
                    label="Organization Name" 
                    v-model="organizationName" 
                    :rules="rules.required"
                    ></v-text-field>
                    <v-text-field 
                    label="Contact Name" 
                    v-model="contactName" 
                    :rules="rules.required"
                    ></v-text-field>
                    <v-text-field 
                    label="Phone Number" 
                    v-model="phoneNumber" 
                    :rules="rules.phone"
                    ></v-text-field>
                    <v-text-field 
                    label="Email" 
                    v-model="email" 
                    :rules="rules.email"
                    ></v-text-field>
                    <v-text-field 
                    label="Number of People (Max: 8)" 
                    type="number" 
                    :max="8"
                    :rules="rules.numberPeople"
                    ></v-text-field>
                    <v-menu
                        ref="menu"
                        v-model="menu"
                        :close-on-content-click="false"
                        :return-value.sync="dates"
                        transition="scale-transition"
                        offset-y
                        min-width="auto"
                    >
                        <template v-slot:activator="{ on, attrs }">
                            <v-combobox
                                v-model="dates"
                                multiple
                                chips
                                small-chips
                                label="Choose dates to volunteer"
                                prepend-icon="mdi-calendar"
                                readonly
                                v-bind="attrs"
                                v-on="on"
                                :rules="rules.dateRequired"
                            >
                                <template v-slot:selection="{ item, index }">
                                    <v-chip
                                        :key="index"
                                        close
                                        @click:close="removeDate(index)"
                                    >
                                        {{ formatDate(item) }}
                                    </v-chip>
                                </template>
                            </v-combobox>
                        </template>
                        <v-date-picker
                            v-model="dates"
                            multiple
                            no-title
                            scrollable
                        >
                            <v-spacer></v-spacer>
                            <v-btn text color="primary" @click="menu = false">Cancel</v-btn>
                            <v-btn text color="primary" @click="$refs.menu.save(dates)">OK</v-btn>
                        </v-date-picker>
                    </v-menu>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-btn color="grey darken-1" text @click="dialog = false">Close</v-btn>
                <v-spacer></v-spacer>
                <v-btn color="primary" :disabled="!formValid">Send</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    props: ['value'], // Accepts the value prop
    data() {
        return {
            dialog: false, // This will now be controlled based on the value prop
            organizationName: '',
            contactName: '',
            phoneNumber: '',
            email: '',
            dates: [],
            menu: false,
            formValid: false,
            rules: { // Define validation rules
                required: [v => !!v || 'Field is required'],
                email: [
                    v => !!v || 'E-mail is required',
                    v => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(v) || 'E-mail must be valid'
                ],
                phone: [
                    v => !!v || 'Phone number is required',
                    v => /^\d{3}-\d{3}-\d{4}$/.test(v) || 'Phone must be in the format 123-456-7890'
                ],
                numberPeople: [
                    v => !!v || 'Number of people is required',
                    v => (v > 0 && v <= 8) || 'Number of people must be between 1 and 8'
                ],
                dateRequired: [
                    v => (v && v.length > 0) || 'At least one date must be selected'
                ],
            },
        };
    },
    watch: {
        value(newVal) {
            this.dialog = newVal; // Update dialog based on the value prop changes
        },
        dialog(newVal) {
            this.$emit('input', newVal); // Emit changes to keep the parent in sync
        },
    },
    methods: {
        formatDate(date) {
            const dt = new Date(date);
            const day = dt.getDate();
            const month = dt.toLocaleString('en-US', { month: 'long' });
            const year = dt.getFullYear();
            const suffix = this.getDaySuffix(day);

            return `${month} ${day}${suffix}, ${year}`;
        },
        getDaySuffix(day) {
            if (day > 3 && day < 21) return 'th';
            switch (day % 10) {
                case 1:  return "st";
                case 2:  return "nd";
                case 3:  return "rd";
                default: return "th";
            }
        },
        removeDate(index) {
            this.dates.splice(index, 1);
        },
    }
}
</script>