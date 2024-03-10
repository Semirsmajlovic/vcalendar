<template>
    <v-app>

        <v-app-bar color="primary" app flat dark>
            <!-- Start: Logo & Heading -->
            <div class="d-flex align-left clickable-area" @click="navigateHome">
                <v-img
                    alt="Vuetify Logo"
                    class="shrink mr-2"
                    contain
                    src="https://i.ibb.co/ynd8rhz/hstl.png"
                    transition="scale-transition"
                    width="40"
                />
                <span class="font-weight-bold logo">Volunteer Calendar</span>
            </div>
            <!-- End: Logo & Heading -->
            
            <!-- Start: Spacing between Logo and Buttons -->
            <v-spacer></v-spacer>
            <!-- End: Spacing between Logo and Buttons -->

            <!-- Conditional rendering based on isLoggedIn -->
            <v-btn 
                color="success" 
                class="ma-2 white--text" 
                @click="$router.push('/login')"
                v-if="!isLoggedIn">
                <v-icon left dark>mdi-login</v-icon>
                Login
            </v-btn>
            <v-btn 
                color="secondary" 
                class="ma-2 white--text" 
                @click="$router.push('/register')"
                v-if="!isLoggedIn">
                <v-icon left dark>mdi-account-plus</v-icon>
                Signup
            </v-btn>
            <v-btn 
                @click="handleSignOut" 
                color="red" 
                class="ma-2 white--text"
                v-else>
                <v-icon left dark>mdi-logout</v-icon>
                Sign Out
            </v-btn>
        </v-app-bar>

        <!-- Start: Main View -->
        <v-main>
            <v-container
            id="main-container"
            fluid
            >
                <router-view></router-view>
            </v-container>
        </v-main>
        <!-- End: Main View -->

    </v-app>
</template>

<script>
import { mapMutations } from "vuex";
import { onMounted } from "vue";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

export default {
    name: "App",
    data() {
        return {
            isLoggedIn: false
        }
    },
    mounted() {
        let auth = getAuth();
        onAuthStateChanged(auth, (user) => {
            this.isLoggedIn = !!user;
            if (user) {
                console.log(`User is signed in with UID: ${user.uid} and Email: ${user.email}`);
            } else {
                console.log("User is signed out");
            }
        });
    },
    methods: {
        ...mapMutations(["navigationDrawerChange"]),
        changeDrawer() {
            try {
                this.navigationDrawerChange();
                console.log("Drawer state changed successfully.");
            } catch (error) {
                console.error("Failed to change drawer state:", error);
            }
        },
        handleSignOut() {
            const auth = getAuth();
            signOut(auth).then(() => {
                console.log("Sign-out successful.");
                this.isLoggedIn = false;
                if (this.$router.currentRoute.path !== '/') {
                    this.$router.push('/');
                }
            }).catch((error) => {
                console.error("Sign-out error:", error);
            });
        },
        navigateHome() {
            this.$router.push('/');
        }
    },
};
</script>

<style lang="scss" >
.logo {
    font-size: 1.75rem;
}
.title--text {
    font-size: 1.5rem;
}
.clickable-area {
    cursor: pointer;
}
</style>