<template>
    <v-form ref="form" v-model="formValid">
        <v-dialog v-model="dialog" persistent max-width="600px" @click:outside="close">
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
                    <div v-if="selectedRole === 'Volunteer' && !isVolunteerLimitReached">
                        <h3>General Volunteer Signup</h3>
                        <p>As a general volunteer, you'll have the opportunity to contribute through various tasks and activities that support our cause.</p>
                        <v-text-field
                            v-model="volunteerName"
                            :rules="rules.name"
                            label="Volunteer Name"
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="volunteerEmail"
                            :rules="rules.email"
                            label="Volunteer Email"
                            required
                        ></v-text-field>
                    </div>
                    <v-alert 
                        v-else-if="selectedRole === 'Volunteer'" 
                        border="top"
                        colored-border
                        color="error"
                        elevation="2"
                    >
                        We have reached the maximum number of volunteers for this shift. Thank you for your interest!
                    </v-alert>
                    <!-- End: Volunteer Section -->

                    <div v-if="selectedRole === 'Driver / Driver Helper' && !isDriverHelperLimitReached">
                        <h3>Driver / Helper Volunteer</h3>
                        <p>As a driver or helper, you play a crucial role in logistics and transportation, ensuring resources and people reach where they are needed most.</p>
                        <!-- Add your Driver / Helper specific fields here -->
                        <v-text-field
                            v-model="driverHelperName"
                            :rules="rules.name"
                            label="Driver or Driver Helper Name"
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="driverHelperEmail"
                            :rules="rules.email"
                            label="Driver or Driver Helper Email"
                            required
                        ></v-text-field>
                        <v-alert
                            class="mt-3"
                            border="top"
                            color="info"
                            colored-border
                            elevation="2"
                        >
                            We kindly request that individuals registering as drivers or driver helpers submit a copy of their valid driver's license and proof of insurance via email. This documentation is essential for ensuring compliance and safety standards. Thank you for your cooperation and commitment.
                        </v-alert>
                    </div>
                    <v-alert 
                        v-else-if="selectedRole === 'Driver / Driver Helper'" 
                        border="top"
                        colored-border
                        color="error"
                        elevation="2"
                    >
                        We have reached the maximum number of drivers/helpers for this shift. Thank you for your interest!
                    </v-alert>


                </v-card-text>
                <v-card-actions>
                    <v-btn color="grey darken-1" text @click="close">Close</v-btn>
                    <v-spacer></v-spacer>
                    <v-btn
                        :disabled="!canParticipate || !formValid"
                        color="primary"
                        @click="updateEvent"
                    >
                        Participate
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-form>
</template>
  
<script>
import { db } from '../main.js';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { mapActions } from "vuex";
import { v4 as uuidv4 } from 'uuid';

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
            formValid: false,
            dialog: this.value,
            selectedRole: 'Volunteer',
            volunteerName: '',
            volunteerEmail: '',
            driverHelperName: '',
            driverHelperEmail: '',
            roles: ['Volunteer', 'Driver / Driver Helper'],
            rules: {
                name: [
                    v => !!v || 'Name is required. Example: John Doe',
                    v => /^[a-zA-Z\s]*$/.test(v) || 'Name must contain only letters and spaces',
                ],
                email: [
                    v => !!v || 'E-mail is required',
                    v => /^[a-zA-Z0-9]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) || 'E-mail must be valid and contain only letters and numbers before the @',
                ],
            },
        };
    },
    computed: {
        isVolunteerLimitReached() {
            return this.selectedShift.volunteerNames?.length >= this.selectedShift.volunteerLimit;
        },
        isDriverHelperLimitReached() {
            return this.selectedShift.driverHelperNames?.length >= this.selectedShift.driverHelperLimit;
        },
        canParticipate() {
            // Determines if the "Participate" button should be enabled based on the selected role and its limit
            if (this.selectedRole === 'Volunteer') {
                return !this.isVolunteerLimitReached;
            } else if (this.selectedRole === 'Driver / Driver Helper') {
                return !this.isDriverHelperLimitReached;
            }
            return true; // Default to true if none of the above conditions are met
        }
    },
    watch: {
        value(newVal) {
            this.dialog = newVal; // Syncs the dialog visibility with the external prop value
        },
        dialog(newVal) {
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
        ...mapActions(["updateSnackMessage"]),
        async updateEvent() {
            try {
                const shift = this.selectedShift;
                let docRef;
                if (shift.isRecurring) {
                    docRef = doc(db, "events", shift.id);
                } else {
                    docRef = doc(db, "exceptions", shift.id);
                }

                // Convert input name and email to lowercase for case-insensitive comparison
                const inputName = this.selectedRole === 'Volunteer' ? this.volunteerName.toLowerCase() : this.driverHelperName.toLowerCase();
                const inputEmail = this.selectedRole === 'Volunteer' ? this.volunteerEmail.toLowerCase() : this.driverHelperEmail.toLowerCase();

                // Check if the user's name and email combination already exists (case-insensitive)
                const nameEmailCombinationExists = (this.selectedRole === 'Volunteer' && shift.volunteerNames?.some(v => v.name.toLowerCase() === inputName && v.email.toLowerCase() === inputEmail)) ||
                    (this.selectedRole === 'Driver / Driver Helper' && shift.driverHelperNames?.some(d => d.name.toLowerCase() === inputName && d.email.toLowerCase() === inputEmail));

                // Does the name and email combination already exist? Return.
                if (nameEmailCombinationExists) {
                    this.updateSnackMessage(`You have already registered to participate.`);
                    console.log("User already registered for this shift.");
                    this.$emit('dialogs-completed');
                    this.close();
                    return;
                }
                let updatePayload = {};
                if (this.selectedRole === 'Volunteer') {
                    updatePayload = {
                        volunteerNames: arrayUnion({
                            id: uuidv4(), // Generate a unique ID for the volunteer
                            name: this.volunteerName,
                            email: this.volunteerEmail
                        })
                    };
                } else if (this.selectedRole === 'Driver / Driver Helper') {
                    updatePayload = {
                        driverHelperNames: arrayUnion({
                            id: uuidv4(), // Generate a unique ID for the driver/helper
                            name: this.driverHelperName,
                            email: this.driverHelperEmail
                        })
                    };
                }
                await updateDoc(docRef, updatePayload);
                this.$emit('dialogs-completed');
                this.close();
            } catch (error) {
                console.error("Failed to update event: ", error);
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