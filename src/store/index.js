import Vue from 'vue';
import Vuex from 'vuex';
import storeCalendar from './storeCalendar';

Vue.use(Vuex);

// State
const state = {
  snackOpen: false,
  snackMessage: '',
  drawer: null,
  user: null,
};

// Actions
const actions = {
  updateSnackMessage({ commit }, msg) {
    try {
      commit('SET_SNACK_MESSAGE', msg);
    } catch (error) {
      console.error('Failed to update snack message:', error);
    }
  },
  setUser({ commit }, user) {
    commit('SET_USER', user);
  },
};

// Mutations
const mutations = {
  SET_SNACK_MESSAGE(state, message) {
    state.snackMessage = message;
  },
  changeDrawer() {
    this.drawerChange();
  },
  SET_USER(state, user) {
    state.user = user;
  },
};

// Getters
const getters = {
  snackOpen: state => state.snackOpen,
  drawerStatus: state => state.drawer,
};

export default new Vuex.Store({
  state,
  mutations,
  actions,
  getters,
  modules: {
    storeCalendar,
  },
});