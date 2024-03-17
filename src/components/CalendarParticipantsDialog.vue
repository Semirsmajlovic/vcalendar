<template>
    <v-dialog v-model="dialog" max-width="600px">
      <v-card>
        <v-card-title>Participants</v-card-title>
        <v-card-text>
          <!-- Participant list or any content goes here -->
          <v-list>
            <v-list-item>
              <v-list-item-content>Test</v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <script>
  export default {
    name: 'CalendarParticipantsDialog',
    props: {
      value: Boolean,
    },
    data() {
      return {
        dialog: false,
      };
    },
    watch: {
      value(val) {
        this.dialog = val;
      },
    },
  };
  </script>