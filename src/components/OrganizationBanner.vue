<template>
    <v-container>
      <v-row justify="center">
        <v-alert
          dense
          outlined
          text
          type="info"
          class="d-flex justify-space-between align-center"
        >
          <span>Organizations sign up here.</span>
          <v-btn small class="ml-2" @click="handleOrganizationSignUp">Click here</v-btn>
        </v-alert>
      </v-row>
    </v-container>
  </template>
  
  <script>
  export default {
    name: 'OrganizationBanner',
    methods: {
      handleOrganizationSignUp() {
        try {
          this.emitSignUpEvent();
        } catch (error) {
          console.error("Error during sign up process:", error);
        }
      },
      emitSignUpEvent() {
        this.$emit('openDialog');
        console.log("Sign up dialog opened."); // Logging the action for debugging purposes
      },
    },
  };
  </script>