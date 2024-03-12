<template>
    <v-dialog v-model="dialog" width="500">
      <v-card>
        <v-card-title class="headline">Volunteer</v-card-title>
        <v-card-text>
          <!-- Your content here -->
          <v-btn color="primary">
            Click Me
          </v-btn>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="close">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
<script>
export default {
    name: 'CalendarVolunteerDialog',
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
        dialog(val) {
        this.$emit('input', val);
        },
    },
    methods: {
        close() {
        this.dialog = false;
        },
    },
};
</script>