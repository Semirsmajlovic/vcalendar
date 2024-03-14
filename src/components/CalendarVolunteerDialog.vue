<template>
    <v-form ref="form">
        <v-dialog v-model="dialog" persistent max-width="600px">
            <v-card>
                <v-card-title>
                    Role Selection
                </v-card-title>
                <v-card-text>
                    <v-select
                        v-model="selectedRole"
                        :items="roles"
                        label="Choose a role"
                        outlined
                    ></v-select>

                    <!-- Start: Volunteer Section -->
                    <div v-if="selectedRole === 'Volunteer'">
                        <h3>General Volunteer Signup</h3>
                        <p>As a general volunteer, you'll have the opportunity to contribute through various tasks and activities that support our cause.</p>
                        <v-text-field
                            v-model="volunteerName"
                            label="Volunteer Name"
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="volunteerEmail"
                            label="Volunteer Email (Optional)"
                        ></v-text-field>
                    </div>
                    <!-- End: Volunteer Section -->

                    <div v-else-if="selectedRole === 'Driver / Driver Helper'">
                        <h3>Driver / Helper Volunteer</h3>
                        <p>As a driver or helper, you play a crucial role in logistics and transportation, ensuring resources and people reach where they are needed most.</p>
                        <!-- Add your Driver / Helper specific fields here -->
                        <v-text-field
                            v-model="driverHelperName"
                            label="Driver or Driver Helper Name"
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="driverHelperEmail"
                            label="Driver or Driver Helper Email"
                            required
                        ></v-text-field>
                    </div>
                </v-card-text>




                <v-card-actions>
                    <v-btn color="grey darken-1" text @click="close">Close</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="updateEvent">Participate</v-btn>
                </v-card-actions>




            </v-card>
        </v-dialog>
    </v-form>
</template>
  
<script>
import { db } from '../main.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
export default {
    name: 'CalendarVolunteerDialog',
    props: {
        value: Boolean,
        selectedShift: {
            type: Object,
            default() {
                return {};
            },
        },
    },
    data() {
        return {
            dialog: this.value,
            selectedRole: 'Volunteer',
            volunteerName: '',
            volunteerEmail: '',
            driverHelperName: '',
            driverHelperEmail: '',
            roles: ['Volunteer', 'Driver / Driver Helper'],
        };
    },
    watch: {
        value(newVal) {
            this.dialog = newVal; // Syncs the dialog visibility with the external prop value
        },
        dialog(newVal) {
            if (newVal) {
                console.log(this.selectedShift); // Logs the selected shift details when the dialog is opened
            }
            if (!newVal) {
                this.$emit('input', newVal); // Emits an event to update the parent component about the dialog's closure
            }
        },
        selectedRole(newVal, oldVal) {
            if (newVal !== oldVal) {
                this.clearFields(); // Call clearFields method when the selected role changes
            }
        }
    },
    methods: {
        async updateEvent() {
            try {
                const shift = this.selectedShift; // Retrieves the selected shift object from component data
                let docRef;
                if (shift.isRecurring) {
                    docRef = doc(db, "events", shift.id); // Sets docRef to a Firestore document reference in the "events" collection if the shift is recurring
                } else {
                    docRef = doc(db, "exceptions", shift.id); // Sets docRef to a Firestore document reference in the "exceptions" collection if the shift is not recurring
                }
                let updatePayload = {};
                if (this.selectedRole === 'Volunteer') {
                    updatePayload = {
                        volunteerNames: arrayUnion({ 
                            name: this.volunteerName, 
                            email: this.volunteerEmail 
                        }) // Prepares the payload to add a new volunteer to the volunteerNames array in the document
                    };
                } else if (this.selectedRole === 'Driver / Driver Helper') {
                    updatePayload = {
                        driverHelperNames: arrayUnion({ 
                            name: this.driverHelperName, 
                            email: this.driverHelperEmail 
                        }) // Prepares the payload to add a new driver/helper to the driverHelperNames array in the document
                    };
                }
                await updateDoc(docRef, updatePayload); // Updates the Firestore document with the new volunteer or driver/helper information
                this.close(); // Closes the dialog after successful update
            } catch (error) {
                console.error("Failed to update event: ", error); // Logs an error if the update fails
            }
        },
        resetDialog() {
            this.clearFields(); // Clears all input fields
            this.dialog = false; // Closes the dialog
            this.selectedRole = 'Volunteer'; // Resets the selected role to its default value if needed
        },
        clearFields() {
            this.volunteerName = '';
            this.volunteerEmail = '';
            this.driverHelperName = '';
            this.driverHelperEmail = '';
        },
        close() {
            this.resetDialog();
        },
    },
};
</script>