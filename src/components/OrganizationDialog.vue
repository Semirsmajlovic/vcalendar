<template>
    <v-dialog v-model="dialog" persistent max-width="600px" @click:outside="dialog = false">
      <v-card>
        <v-card-title>
          Organization Details
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field label="Organization Name" v-model="organizationName"></v-text-field>
            <v-text-field label="Contact Name" v-model="contactName"></v-text-field>
            <v-text-field label="Phone Number" v-model="phoneNumber"></v-text-field>
            <v-text-field label="Email" v-model="email"></v-text-field>
            <v-text-field label="Number of People (Max: 8)" type="number" :max="8" v-model="numberOfPeople"></v-text-field>
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
                ></v-combobox>
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
            <!-- Close button on the left -->
            <v-btn color="light-grey" text @click="dialog = false">Close</v-btn>
            <v-spacer></v-spacer> <!-- This pushes the following button to the right -->
            <!-- Send button on the right -->
            <v-btn color="green" text @click="sendEmail">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>

<script>
import emailjs from 'emailjs-com';
export default {
    props: ['value'], // Accepts the value prop
    data() {
        return {
        dialog: false, // This will now be controlled based on the value prop
        organizationName: '',
        contactName: '',
        phoneNumber: '',
        email: '',
        numberOfPeople: '',
        dates: [],
        menu: false,
        };
    },
    watch: {
        value(newVal) {
            this.dialog = newVal; // Update dialog based on the value prop changes
        },
        dialog(newVal) {
            this.$emit('input', newVal); // Emit changes to keep the parent in sync
        },
        numberOfPeople(newValue) {
            this.checkNumberOfPeople();
        },
    },
    methods: {
        checkNumberOfPeople() {
            if (parseInt(this.numberOfPeople) > 8) {
                this.numberOfPeople = '8';
            }
        },
        sendEmail() {
            const emailParams = {
                organization_name: this.organizationName,
                contact_name: this.contactName,
                phone_number: this.phoneNumber,
                email: this.email,
                number_of_people: this.numberOfPeople,
                days_to_volunteer: this.dates.join(', '), // Updated to use `dates`
            };

            emailjs.send('service_ug33hrl', 'template_00ob19j', emailParams, 'nQeNPSgRwskhINwUu')
                .then((response) => {
                    console.log('SUCCESS!', response.status, response.text);
                    this.dialog = false; // Close the dialog on success
                }, (error) => {
                    console.log('FAILED...', error);
                });
        }
    }
}
</script>