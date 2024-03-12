<template>
    <v-form ref="form" v-model="valid">
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
                        label="Volunteer Name"
                        :rules="[v => !!v || 'Name is required']"
                        required
                    ></v-text-field>
                    <v-text-field
                        label="Volunteer Email"
                        :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'E-mail must be valid']"
                        required
                    ></v-text-field>
                </div>
                <!-- End: Volunteer Section -->

                <div v-else-if="selectedRole === 'Driver / Helper'">
                    <h3>Driver / Helper Volunteer</h3>
                    <p>As a driver or helper, you play a crucial role in logistics and transportation, ensuring resources and people reach where they are needed most.</p>
                    <!-- Add your Driver / Helper specific fields here -->
                </div>
                <div v-else-if="selectedRole === 'Organization'">
                    <h3>Group Volunteering by Organizations</h3>
                    <p>When an organization signs up to volunteer, it amplifies the impact through collective action. Your group's contribution can significantly advance our cause, whether through hands-on tasks or administrative support. This option is ideal for organizations looking to volunteer as a team of up to 8 members.</p>
                    <!-- Add your Driver / Helper specific fields here -->
                </div>

                </v-card-text>
                <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" text @click="dialog = false">Close</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-form>
</template>
  
<script>
export default {
    name: 'CalendarVolunteerDialog',
    props: {
        value: Boolean,
    },
    data() {
        return {
            valid: false,
            dialog: false,
            selectedRole: 'Volunteer',
            roles: ['Volunteer', 'Driver / Helper', 'Organization'],
        };
    },
    watch: {},
    methods: {
        close() {
            this.dialog = false;
        },
    },
};
</script>