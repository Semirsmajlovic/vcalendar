import Vue from 'vue';
import Router from 'vue-router';
import Home from '../views/Home.vue';
import Register from '../views/Register.vue';
import Login from '../views/Login.vue';
// Import Firebase Auth or your authentication mechanism here if needed
import { getAuth, onAuthStateChanged } from "firebase/auth";

Vue.use(Router);

const router = new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        { path: '/', component: Home },
        { path: '/register', component: Register },
        { path: '/login', component: Login },
    ]
});

/**
 * `getCurrentUser` is a function that returns a Promise which resolves with the current user object if a user is logged in,
 * or rejects with an error message if no user is logged in or if an error occurs during the authentication state check.
 */
const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const auth = getAuth(); // Initialize Firebase Auth
        const removeListener = onAuthStateChanged(
            auth,
            (user) => {
                removeListener(); // Unsubscribe from the auth state listener once the user state is known
                if (user) {
                    resolve(user); // Resolve the promise with the user object if a user is logged in
                } else {
                    reject("No user logged in"); // Reject the promise if no user is logged in
                }
            },
            (error) => {
                removeListener(); // Ensure to unsubscribe from the listener in case of an error
                reject(error); // Reject the promise with the error encountered during the auth state check
            }
        );
    });
};

router.beforeEach(async (to, from, next) => {
    const isAuthenticated = await getCurrentUser().then(() => true).catch(() => false);

    if (to.matched.some(record => record.meta.requiresAuth)) {
        if (!isAuthenticated) {
            // User is not authenticated, redirect to login
            next('/login');
        } else {
            // User is authenticated, proceed to the route
            next();
        }
    } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
        // If the user is already authenticated and tries to access login or register, redirect them
        next('/');
    } else {
        // No specific auth rules for the route, proceed to the route
        next();
    }
});

export default router;