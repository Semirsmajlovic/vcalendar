<template>
    <v-dialog v-model="dialog" persistent max-width="600px" @click:outside="dialog = false">
        <v-card>
            <v-card-title>
                Organization Details
                <v-tooltip bottom>
                    <template v-slot:activator="{ on, attrs }">
                        <v-icon v-bind="attrs" v-on="on" color="red" style="margin: 0 auto; margin-right: 0">mdi-help-circle</v-icon>
                    </template>
                    <span v-html="tooltipContentOrganizationDialog"></span>
                </v-tooltip>
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
                    v-model="numberOfPeople"
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
                            :min="minDate"
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
                <v-btn color="primary" :disabled="!formValid" @click="sendForm">Send</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import UseEmail from '../plugins/UseEmail.js';
import { mapActions } from 'vuex';

export default {
    mixins: [UseEmail],
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
            numberOfPeople: '',
            formValid: false,
            minDate: new Date().toISOString().substr(0, 10), // Get today's date in YYYY-MM-DD format
            rules: { // Define validation rules
                required: [v => !!v || 'Field is required'],
                email: [
                    v => !!v || 'E-mail is required',
                    v => /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) || 'E-mail must be valid'
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
                    v => (v && v.length > 0) || 'At least one date must be selected',
                    v => (v && v.length <= 5) || 'You can select up to 5 dates only' // New rule
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
    computed: {
        tooltipContentOrganizationDialog() {
            return `
                <div>Contact support</div>
                <div>Another entry</div>
            `;
        }
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        sendForm() {
            if (!this.formValid) {
                console.error("Form is not valid.");
                return;
            }
            const endpointUrl = 'https://public.herotofu.com/v1/9b846ad0-eb7d-11ee-a139-63688650e2a2';
            const sortedDates = this.dates.sort((a, b) => new Date(a) - new Date(b));
            const groupedByMonth = sortedDates.reduce((acc, date) => {
                const dt = new Date(date);
                const monthYearKey = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                if (!acc[monthYearKey]) {
                    acc[monthYearKey] = [];
                }
                acc[monthYearKey].push(this.formatDate(date));
                return acc;
            }, {});
            const formattedDates = Object.entries(groupedByMonth).map(([monthYear, dates]) => {
                const days = dates.map(date => {
                    const dayWithSuffix = date.replace(/^[^ ]+ /, '').replace(/, \d{4}$/, '');
                    return dayWithSuffix;
                }).join(', ');
                return `${monthYear}: ${days}`;
            }).join(' | ');
            const formData = {
                "Organization Name": this.organizationName,
                "Contact Name": this.contactName,
                "Phone Number": this.phoneNumber,
                "Email": this.email,
                "Number of Participants": this.numberOfPeople,
                "Volunteering Dates": formattedDates,
            };
            this.sendEmail(endpointUrl, formData).then(() => {
            }).catch((error) => {
                console.error("Error submitting form:", error.message);
            });
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        async sendEmail(endpointUrl, data) {
            try {
                this.loading = true;
                const response = await fetch(endpointUrl, {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                });
                if (response.status === 422) {
                    throw new Error("Validation failed: Are you a robot?");
                }
                if (response.status !== 200) {
                    throw new Error(`Error: ${response.statusText} (${response.status})`);
                }
                await response.json(); // Assuming the response needs to be processed
                this.submitted = true;
                this.updateSnackMessage("Email sent successfully.");
            } catch (error) {
                this.error = error.toString();
                this.updateSnackMessage(`Error sending email: ${error.message}`);
            } finally {
                this.loading = false;
                this.dialog = false; // Consider moving this to a more appropriate place depending on UX requirements
            }
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        formatDate(date) {
            const dt = new Date(date);
            const day = dt.getDate();
            const [month, , year] = dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).split(' ');
            const suffix = ((day) => {
                if (day > 3 && day < 21) return 'th';
                switch (day % 10) {
                    case 1:  return "st";
                    case 2:  return "nd";
                    case 3:  return "rd";
                    default: return "th";
                }
            })(day);
            return `${month} ${day}${suffix}, ${year}`;
        },

        // ===================================================================================== //
        // Method - Accessible from the component's template.

        removeDate(index) {
            if (index >= 0 && index < this.dates.length) {
                this.dates.splice(index, 1);
            }
        },
    }
}
</script>