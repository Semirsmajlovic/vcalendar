import Vue from 'vue';
import Vuex from 'vuex';
import storeCalendar from './storeCalendar';
import { db } from '../main.js'; // Assuming this is the path to your Firebase initialization
import { deleteDoc, collection, getDocs } from 'firebase/firestore';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    snackOpen: false,
    snackMessage: '',
    drawer: null,
    user: null,
  },
  modules: {
    storeCalendar
  },
  actions: {
		updateSnackMessage({ commit, state }, msg) {
			commit('SET_SNACK_MESSAGE', msg);
		},
    setUser({ commit }, user) {
      commit('SET_USER', user);
    },
    async deleteCollectionsAndRefresh(context) {
      const deleteCollection = async (collectionPath) => {
        const querySnapshot = await getDocs(collection(db, collectionPath));
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      };
      await Promise.all([
        deleteCollection('events'),
        deleteCollection('exceptions'),
      ]);
    },
  },
  mutations: {
    SET_SNACK_MESSAGE(state, message) {
			state.snackMessage = message;
		},
    SET_USER(state, user) {
      state.user = user;
    },
		drawerChange(state) {
			state.drawer = !state.drawer;
		}
  },
  getters: {
    snackOpen: (state) => {
			return state.snackOpen;
		},
		drawerStatus: (state) => {
			return state.drawer;
		}
  }
});