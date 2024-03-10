<template>
    <v-container>
      <v-row justify="center">
        <v-col cols="12" sm="8" md="6">
          <v-card class="pa-5" elevation="2">
            <v-form @submit.prevent="login">
              <v-text-field
                label="Email"
                v-model="email"
                :rules="[v => !!v || 'E-mail is required', v => /.+@.+\..+/.test(v) || 'E-mail must be valid']"
                type="email"
                placeholder="Enter your email"
                :error-messages="errorMsg.email"
              ></v-text-field>
              <v-text-field
                label="Password"
                v-model="password"
                :rules="[v => !!v || 'Password is required']"
                type="password"
                placeholder="Enter your password"
                :error-messages="errorMsg.password"
              ></v-text-field>
              <v-btn :loading="loading" type="submit" color="primary" block large>Login</v-btn>
            </v-form>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>
  
  <script>
  import authService from "@/services/authService";
  
  export default {
    data() {
      return {
        email: '',
        password: '',
        errorMsg: { email: '', password: '' },
        loading: false,
      };
    },
    methods: {
      async login() {
        this.loading = true;
        this.errorMsg = { email: '', password: '' };
        try {
          await authService.login(this.email, this.password);
          this.$router.push('/');
        } catch (error) {
          this.handleError(error);
        } finally {
          this.loading = false;
        }
      },
      handleError(error) {
        switch (error.code) {
          case "auth/invalid-email":
            this.errorMsg.email = "Invalid Email";
            break;
          case "auth/user-not-found":
          case "auth/wrong-password":
            this.errorMsg.password = "Incorrect email or password";
            break;
          default:
            this.errorMsg.email = "An error occurred. Please try again";
            break;
        }
      },
    },
  };
  </script>