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

// Mutations
const mutations = {
  SET_SNACK_MESSAGE(state, message) {
    state.snackMessage = message;
  },
  TOGGLE_DRAWER(state) {
    state.drawer = !state.drawer;
  },
  SET_USER(state, user) {
    state.user = user;
  },
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
  toggleDrawer({ commit }) {
    try {
      commit('TOGGLE_DRAWER');
    } catch (error) {
      console.error('Failed to toggle drawer:', error);
    }
  },
  setUser({ commit }, user) {
    commit('SET_USER', user);
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