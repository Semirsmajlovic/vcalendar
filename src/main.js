import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';


import store from './store';
import router from './routes/index';
import { initializeApp } from "firebase/app";
import { getFirestore, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import '@mdi/font/css/materialdesignicons.css';

const firebaseConfig = {
  apiKey: "AIzaSyA2kcGZUxb1excFSOplW1iQaUTPXVepFoI",
  authDomain: "volunteer-portal-hstl-3ef78.firebaseapp.com",
  projectId: "volunteer-portal-hstl-3ef78",
  storageBucket: "volunteer-portal-hstl-3ef78.appspot.com",
  messagingSenderId: "46168409713",
  appId: "1:46168409713:web:54fa4a0ff632f7b7f1bdd0"
};
initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore();
export { db };

Vue.prototype.$Timestamp = Timestamp;
Vue.config.productionTip = false;

let app;

getAuth().onAuthStateChanged(user => {
  store.dispatch('setUser', user); // Dispatch action to update user state
  if (!app) {
    app = new Vue({
      vuetify,
      store,
      router,
      render: h => h(App, { props: { isLoggedIn: !!user } }),
    }).$mount('#app');
  }
});