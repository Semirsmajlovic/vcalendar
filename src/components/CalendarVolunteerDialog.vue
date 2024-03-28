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
                            hint="Example: Bob Smith"
                            persistent-hint
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="volunteerEmail"
                            :rules="rules.email"
                            label="Volunteer Email"
                            hint="Example: bobsmith@yahoo.com"
                            persistent-hint
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="volunteerPhone"
                            :rules="rules.phone"
                            label="Volunteer Phone (Optional)"
                            hint="Example: 123-456-7890"
                            persistent-hint
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
                            hint="Example: Bob Smith"
                            persistent-hint
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="driverHelperEmail"
                            :rules="rules.email"
                            label="Driver or Driver Helper Email"
                            hint="Example: bobsmith@yahoo.com"
                            persistent-hint
                            required
                        ></v-text-field>
                        <v-text-field
                            v-model="driverHelperPhone"
                            :rules="rules.phone"
                            label="Driver / Helper Phone (Optional)"
                            hint="Example: 123-456-7890"
                            persistent-hint
                        ></v-text-field>
                        <v-alert
                            class="mt-6"
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
                        @click="updateShiftAndSendEmail"
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
import UseEmail from '../plugins/UseEmail.js';

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
            volunteerPhone: '',
            driverHelperName: '',
            driverHelperEmail: '',
            driverHelperPhone: '',
            roles: ['Volunteer', 'Driver / Driver Helper'],
            rules: {
                name: [
                    v => !!v || 'Name is required.',
                    v => /^[a-zA-Z\s]*$/.test(v) || 'Name must contain only letters and spaces.',
                ],
                email: [
                    v => !!v || 'E-mail is required.',
                    v => /^[a-zA-Z0-9]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) || 'E-mail must be valid.',
                ],
                phone: [
                    v => !v || /^\d{3}-\d{3}-\d{4}$/.test(v) || 'Phone must be in the format 123-456-7890',
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
                this.volunteerName = '';
                this.volunteerEmail = '';
                this.volunteerPhone = '';
                this.driverHelperName = '';
                this.driverHelperEmail = '';
                this.driverHelperPhone = '';
            }
        }
    },
    methods: {
        ...mapActions(["updateSnackMessage"]),
        sendForm() {
            if (this.formValid) {
                const endpointUrl = 'https://public.herotofu.com/v1/25116e10-eb7e-11ee-a139-63688650e2a2';
                const formData = this.prepareFormData();
                this.sendEmail(endpointUrl, formData);
            }
        },
        sendEmail(endpointUrl, data) {
            this.loading = true;
            this.submitted = false;
            this.error = null;
            fetch(endpointUrl, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })
            .then((response) => {
                if (response.status === 422) {
                    throw new Error("Are you robot?");
                }
                if (response.status !== 200) {
                    throw new Error(`${response.statusText} (${response.status})`);
                }
                return response.json();
            })
            .then(() => {
                this.submitted = true;
                this.loading = false;
                this.dialog = false;
            })
            .catch((err) => {
                this.error = err.toString();
                this.loading = false;
            });
        },
        prepareFormData() {
            let formData = {
                "Selected Role": this.selectedRole === 'Volunteer' ? 'Volunteer' : 'Driver / Driver Helper',
            };
            if (this.selectedRole === 'Volunteer') {
                formData = {
                    ...formData,
                    "Volunteer Name:": this.volunteerName,
                    "Volunteer Email:": this.volunteerEmail,
                    "Volunteer Phone:": this.volunteerPhone,
                };
            } else if (this.selectedRole === 'Driver / Driver Helper') {
                formData = {
                    ...formData,
                    "Driver / Helper Name": this.driverHelperName,
                    "Driver / Email": this.driverHelperEmail,
                    "Driver / Phone": this.driverHelperPhone,
                };
            }

            // Add "Shift Selected" before "Notes"
            if (this.selectedShift && this.selectedShift.start) {
                const formattedDate = this.formatDateWithOrdinal(new Date(this.selectedShift.start));
                formData["Shift Selected"] = formattedDate;
            }

            // Now, add "Notes" for the 'Driver / Driver Helper' role, ensuring it comes after "Shift Selected"
            if (this.selectedRole === 'Driver / Driver Helper') {
                formData["Notes"] = "Please contact the driver or driver helper at your earliest convenience to request a copy of their current driver's license and proof of insurance using the email or phone number provided.";
            }
            return formData;
        },
        formatDateWithOrdinal(date) {
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
            const formatter = new Intl.DateTimeFormat('en-US', options);
            const parts = formatter.formatToParts(date);
            let day;
            let ordinalSuffix;
            parts.forEach(part => {
                if (part.type === 'day') {
                    day = parseInt(part.value, 10);
                }
            });
            if (day) {
                if (day % 10 === 1 && day !== 11) {
                    ordinalSuffix = 'st';
                } else if (day % 10 === 2 && day !== 12) {
                    ordinalSuffix = 'nd';
                } else if (day % 10 === 3 && day !== 13) {
                    ordinalSuffix = 'rd';
                } else {
                    ordinalSuffix = 'th';
                }
            }
            const formattedDate = parts.map(part => {
                if (part.type === 'day') {
                    return `${part.value}${ordinalSuffix}`;
                }
                return part.value;
            }).join('');

            return formattedDate;
        },
        async updateEvent() {
            try {
                const shift = this.selectedShift;
                let docRef;
                if (shift.isRecurring) {
                    docRef = doc(db, "events", shift.id);
                } else {
                    docRef = doc(db, "exceptions", shift.id);
                }
                const combinedNameEmail = this.selectedRole === 'Volunteer' ? `${this.volunteerName} (${this.volunteerEmail})` : `${this.driverHelperName} (${this.driverHelperEmail})`;
                const nameEmailCombinationExistsInVolunteers = shift.volunteerNames?.some(v => v.name.toLowerCase() === combinedNameEmail.toLowerCase());
                const nameEmailCombinationExistsInDriverHelpers = shift.driverHelperNames?.some(d => d.name.toLowerCase() === combinedNameEmail.toLowerCase());
                if (nameEmailCombinationExistsInVolunteers || nameEmailCombinationExistsInDriverHelpers) {
                    this.updateSnackMessage(`You have already registered to participate in one of the roles.`);
                    console.log("User already registered for this shift in one of the roles.");
                    this.$emit('dialogs-completed');
                    this.close();
                    return false; // Indicate early exit
                }
                let updatePayload = {};
                if (this.selectedRole === 'Volunteer') {
                    updatePayload = {
                        volunteerNames: arrayUnion({
                            name: `${this.volunteerName} (${this.volunteerEmail})`, // Combine name and email
                            email: this.volunteerEmail,
                            phone: this.volunteerPhone
                        })
                    };
                } else if (this.selectedRole === 'Driver / Driver Helper') {
                    updatePayload = {
                        driverHelperNames: arrayUnion({
                            name: `${this.driverHelperName} (${this.driverHelperEmail})`, // Combine name and email
                            email: this.driverHelperEmail,
                            phone: this.driverHelperPhone
                        })
                    };
                }
                await updateDoc(docRef, updatePayload);
                this.$emit('dialogs-completed');
                this.close();
                return true; // Indicate successful completion
            } catch (error) {
                console.error("Failed to update event: ", error);
                return false; // Indicate failure
            }
        },
        async updateShiftAndSendEmail() {
            const updateSuccessful = this.updateEvent();
            if (updateSuccessful) {
                this.sendForm();
            }
        },
        close() {
            this.volunteerName = '';
            this.volunteerEmail = '';
            this.volunteerPhone = '';
            this.driverHelperName = '';
            this.driverHelperEmail = '';
            this.driverHelperPhone = '';
            this.dialog = false; // Closes the dialog
            this.selectedRole = 'Volunteer'; // Resets the selected role to its default value if needed
        },
    },
};
</script>