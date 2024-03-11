<template>
<v-dialog v-model="dialog" max-width="600px">
    <v-card>
    <v-card-title>
        Organization Management
    </v-card-title>
    <v-card-text>
        <!-- Your form or content here -->
        <span>Manage your organization settings here.</span>
    </v-card-text>
    <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="dialog = false">Close</v-btn>
    </v-card-actions>
    </v-card>
</v-dialog>
</template>
  
<script>
export default {
name: 'OrganizationDialog',
data() {
    return {
    dialog: false,
    };
},
methods: {
    open() {
    this.dialog = true;
    },
},
};
</script>