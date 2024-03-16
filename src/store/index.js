import Vue from 'vue';
import Vuex from 'vuex';
import storeCalendar from './storeCalendar';

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
    }
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