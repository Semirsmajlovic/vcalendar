<template>
    <v-container>
        <v-row justify="center">
        <v-col cols="12" sm="8" md="6">
            <v-card class="pa-5" elevation="2">
            <v-form @submit.prevent="register" ref="form">
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
                :rules="[v => !!v || 'Password is required', v => v.length >= 6 || 'Minimum 6 characters']"
                type="password"
                placeholder="Enter your password"
                counter
                :error-messages="errorMsg.password"
                ></v-text-field>
                <v-btn :loading="loading" type="submit" color="primary" block large>Submit</v-btn>
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
        errorMsg: {},
        loading: false,
        };
    },
    methods: {
        async register() {
            this.loading = true;
            this.errorMsg = {};
            try {
                await authService.register(this.email, this.password);
                this.$router.push('/');
            } catch (error) {
                this.handleError(error);
            } finally {
                this.loading = false;
            }
        },
        handleError(error) {
            const message = error.message || "An error occurred during registration";
            if (error.code) {
                switch (error.code) {
                case "auth/email-already-in-use":
                    this.errorMsg.email = "This email is already in use";
                    break;
                case "auth/invalid-email":
                    this.errorMsg.email = "Invalid Email";
                    break;
                case "auth/weak-password":
                    this.errorMsg.password = "Password should be at least 6 characters";
                    break;
                default:
                    this.$emit('error', message); // Emit an event or use a global error handler
                    break;
                }
            } else {
                this.$emit('error', message); // Handle non-Firebase errors
            }
        },
    },
};
</script>