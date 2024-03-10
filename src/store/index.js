import Vue from 'vue';
import Vuex from 'vuex';
import storeCalendar from './storeCalendar';

Vue.use(Vuex);

export default new Vuex.Store({
	state     : {
		snackOpen    : false,
		snackMessage : '',
		drawer       : null
	},
	modules   : {
		storeCalendar
	},
	actions   : {
		updateSnackMessage({ commit, state }, msg) {
			commit('setSnackMessage', msg);
		}
	},
	mutations : {
		setSnackMessage(state, message) {
			state.snackMessage = message;
		},
		drawerChange(state) {
			state.drawer = !state.drawer;
		}
	},
	getters   : {
		snackOpen    : (state) => {
			return state.snackOpen;
		},
		drawerStatus : (state) => {
			return state.drawer;
		}
	}
});
