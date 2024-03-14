import Vue from 'vue';
import Vuex from 'vuex';
import storeCalendar from './storeCalendar';

Vue.use(Vuex);

// Mutation Types
const SET_SNACK_MESSAGE = 'SET_SNACK_MESSAGE';
const TOGGLE_DRAWER = 'TOGGLE_DRAWER';
const SET_USER = 'SET_USER';

// Centralized Error Handler
function handleError(action, error) {
  console.error(`Failed to ${action}:`, error);
}

// State
const state = {
  snackOpen: false,
  snackMessage: '',
  drawer: null,
  user: null,
};

// Mutations
const mutations = {
  [SET_SNACK_MESSAGE](state, message) {
    state.snackMessage = message;
  },
  [TOGGLE_DRAWER](state) {
    state.drawer = !state.drawer;
  },
  [SET_USER](state, user) {
    state.user = user;
  },
};

// Actions
const actions = {
  updateSnackMessage({ commit }, msg) {
    try {
      commit(SET_SNACK_MESSAGE, msg);
    } catch (error) {
      handleError('update snack message', error);
    }
  },
  toggleDrawer({ commit }) {
    try {
      commit(TOGGLE_DRAWER);
    } catch (error) {
      handleError('toggle drawer', error);
    }
  },
  setUser({ commit }, user) {
    try {
      commit(SET_USER, user);
    } catch (error) {
      handleError('set user', error);
    }
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