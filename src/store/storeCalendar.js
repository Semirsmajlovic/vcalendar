import { v4 as uuidv4 } from 'uuid';
import { leadingZero, getFocus, getNamesInView, changeRecurringEnd, createAllEvents, makeRecurringEvents } from './storeCalendarHelpers';
import axios from 'axios';

/*
[1] state.events - Array of recurring objects - Recurring objects have isRecurring and rruleString which is used to produce recurring instances at runtime using RRule. 

[2] state.exceptions - Array of one time events, diverged recurring event turned to one time event or deleted recurring event turned to one time event

[3] state.instances - Combination of state.events and state.exceptions that is calculated at runtime. The actual events shown in calendar
*/

const storeCalendar = {
	namespaced : true,
	state      : {
		eventOpen      : false, // Dialog open/closed status
		newEventSignal : false, // Signal to components that an event has been created or deleted to repopulate names
		caregiverNames : [], // Names of all possible caregivers in view. Used in CalendarSideBar
		clientNames    : [], // Names of all the clients in view in view. Used in CalendarSideBar
		selectedPerson : {}, // Sets the calendar's view to this person when clicking on names in CalendarSideBar
		instances      : [], // All events shown in calendar view - calculated at runtime by combining state.events and state.exceptions
		tempCaregiver  : '', // Temporary storage used when adding a new caregiver. Used in CalendarSideBar
		tempClient     : '', // Temporary storage used when adding a new client. Used in CalendarSideBar
		events         : [
			// Recurring events
			{
				cal_id      : `${uuidv4()}`,
				caregiver   : 'Sigourney Reaver',
				client      : 'Michelle Milano',
				start       : `${new Date().getFullYear()}-01-02 07:00`,
				end         : `${new Date().getFullYear()}-01-02 11:00`,
				duration    : '4',
				isRecurring : true,
				rruleString : 'DTSTART:20200102T070000Z\nRRULE:FREQ=WEEKLY;BYDAY=TU,TH;INTERVAL=1;UNTIL=20250101T080000Z'
			},
			{
				cal_id      : `${uuidv4()}`,
				caregiver   : 'Harry Berry',
				client      : 'Randy Johnson',
				start       : `${new Date().getFullYear()}-01-01 12:00`,
				end         : `${new Date().getFullYear()}-01-01 20:00`,
				duration    : '8',
				isRecurring : true,
				rruleString : 'DTSTART:20200101T120000Z\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2;UNTIL=20250101T080000Z'
			},
			{
				cal_id      : `${uuidv4()}`,
				caregiver   : 'Walter Boyd',
				client      : 'Sandy Webb',
				start       : `${new Date().getFullYear()}-01-04 03:00`,
				end         : `${new Date().getFullYear()}-01-04 09:30`,
				duration    : '6.5',
				isRecurring : true,
				rruleString : 'DTSTART:20200104T030000Z\nRRULE:FREQ=WEEKLY;BYDAY=SA;INTERVAL=1;UNTIL=20250101T080000Z'
			},
			{
				cal_id      : `${uuidv4()}`,
				caregiver   : 'Courtney Rocks',
				client      : 'Ben Carter',
				start       : `${new Date().getFullYear()}-01-05 20:00`,
				end         : `${new Date().getFullYear()}-01-06 08:00`,
				duration    : '12',
				isRecurring : true,
				rruleString : 'DTSTART:20200105T200000Z\nRRULE:FREQ=WEEKLY;BYDAY=SU;INTERVAL=1;UNTIL=20250101T080000Z'
			}
		],
		exceptions     : [
			// One off events or recurring event where data diverged from original data and turned to one time event
			{
				cal_id      : `${uuidv4()}`,
				caregiver   : 'Randy Hart',
				client      : 'Brad Pizza',
				start       : `${new Date().getFullYear()}-${leadingZero(new Date().getMonth() + 1)}-10 18:00`,
				end         : `${new Date().getFullYear()}-${leadingZero(new Date().getMonth() + 1)}-10 22:00`,
				duration    : '4',
				isRecurring : false,
				rruleString : ''
			}
		]
	},
	actions    : {
		async initInstances({ commit, state, dispatch }, payload) {
			try {
				/* In a real application, get events and exceptions from database and set the states. Since states are already set for this example, this is commented out
				let { data: events } = await axios.get('process.env.API_URL/events');
				let { data: exceptions } = await axios.get('process.env.API_URL/exceptions');
				commit('SET_INIT_EVENTS', [events]);
				commit('SET_INIT_EXCEPTIONS', [exceptions]);
				*/

				// Create all the events from recurring, one time and diverged events
				let allEvents = createAllEvents(
					[
						// using mock data
						...state.events
					],
					[
						// using mock data
						...state.exceptions
					],
					getFocus(payload.focus),
					'',
					''
				);

				// Get all unique names for caregivers and clients to show in CalendarSideBar.vue
				let cgNames = getNamesInView(allEvents, payload.focus, 'caregiver');
				let clNames = getNamesInView(allEvents, payload.focus, 'client');

				commit('SET_NAMES', [
					cgNames,
					clNames
				]);

				// If name and type is provided, filter allEvents to that person only
				let { name, type } = payload;
				if (name || type) {
					allEvents = allEvents.filter((event) => {
						return event[type] === name;
					});
				}
				commit('SET_INIT_INSTANCES', allEvents);
			} catch (e) {
				dispatch('updateSnackMessage', `Error at ${e}`, { root: true });
			}
		},
		async actionCreateNewEvent({ commit, state, dispatch }, payload) {
			try {
				if (!payload.isRecurring) {
					commit('ADD_EXCEPTION', payload);
				} else {
					commit('ADD_EVENT', payload);
				}
			} catch (e) {
				dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
			}
		},
		async updateEvent({ commit, state, getters, dispatch }, payload) {
			if (!payload.isRecurring) {
				/* Updating non recurring exceptions have 2 types
				[1] One time exception ( Regular one time event )
				[2] Recurring event that has diverged and turned into one time exception
				*/
				if (!payload.actionType) {
					// [1] One time event
					try {
						let exceptionIndex = getters.getIndexException(payload);

						commit('UPDATE_EXCEPTION', {
							exceptionIndex,
							payload
						});
					} catch (e) {
						dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
					}
				} else {
					//[2] Recurring event that has diverged and turned into one time exception
					try {
						let divergedIndex = getters.getIndexExceptionDiverged(payload);
						commit('UPDATE_EXCEPTION', {
							divergedIndex,
							payload
						});
					} catch (e) {
						dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
					}
				}
			} else {
				switch (payload.actionType.description) {
					// Handle updating recurring events
					case 'updateAll': {
						try {
							let index = getters.getIndexEvent(payload);
							let updatedEvent = { ...payload };
							commit('UPDATE_EVENT', {
								index,
								updatedEvent
							});
						} catch (e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}
					case 'updateInstance': {
						try {
							payload.actionType.description = 'updateInstance';
							payload.isRecurring = false;
							payload.rruleString = '';
							commit('ADD_EXCEPTION', payload);
						} catch (e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}
					case 'updateForward': {
						try {
							/* Update recurring event going forward splits the recurring event in 2. 
							[1] Give new recurring object going forward a new id and add it to state.events
							[2] Change the original recurrence object's UNTIL string to payload.start which is the start of new recurring object
							*/

							// [1]
							let recurringObjGoingForward = { ...payload };
							recurringObjGoingForward.cal_id = uuidv4();
							commit('ADD_EVENT', recurringObjGoingForward);

							// [2]
							let index = getters.getIndexEvent(payload);
							let updatedEvent = changeRecurringEnd({ ...state.events[index] }, payload.start);
							commit('UPDATE_EVENT', {
								index,
								updatedEvent
							});
						} catch (e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}
					default:
						dispatch('updateSnackMessage', `Unknown actionType in updateEvent`, { root: true });
				}
			}
		},
		async deleteEvent({ commit, state, getters, dispatch }, payload) {
			if (!payload.isRecurring) {
				if (!payload.actionType) {
					// Delete one time event
					try {
						let exceptionIndex = getters.getIndexException(payload);
						commit('DELETE_EXCEPTION', exceptionIndex);
					} catch (e) {
						dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
					}
				} else {
					// Delete diverged event from recurring events
					try {
						let index = getters.getIndexExceptionDiverged(payload);
						payload.actionType.description = 'deleteInstance';

						commit('UPDATE_EXCEPTION', {
							index,
							payload
						});
					} catch (e) {
						dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
					}
				}
			} else {
				switch (payload.actionType.description) {
					case 'deleteAll': {
						try {
							let eventsFound = state.events.filter((element) => {
								return element.cal_id === payload.cal_id;
							});

							if (eventsFound) {
								commit('DELETE_EVENTS_MULTIPLE', eventsFound);
							}
						} catch (e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}
					case 'deleteForward': {
						try {
							let index = getters.getIndexEvent(payload);
							let updatedEvent = changeRecurringEnd({ ...state.events[index] }, payload.start);
							commit('UPDATE_EVENT', {
								index,
								updatedEvent
							});
						} catch (e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}
					case 'deleteInstance': {
						try {
							payload.actionType.description = 'deleteInstance';
							commit('ADD_EXCEPTION', payload);
						} catch (e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}

					default:
						dispatch('updateSnackMessage', `Unknown actionType in deleteEvent`, { root: true });
				}
			}
		},
		updateSelectedPerson({ commit, state }, person) {
			commit('SET_PERSON', person);
		},
		dialogOpen({ commit, state }, dialogStatus) {
			commit('SET_DIALOG', dialogStatus);
		}
	},
	mutations  : {
		SET_INIT_INSTANCES(state, payload) {
			state.instances = payload;
		},
		SET_INIT_EVENTS(state, payload) {
			state.events = payload;
		},
		SET_INIT_EXCEPTIONS(state, payload) {
			state.exceptions = payload;
		},
		SET_PERSON(state, person) {
			state.selectedPerson = person;
		},
		SET_NEW_EVENT_SIGNAL(state, status) {
			state.newEventSignal = status;
		},
		SET_NAMES(state, namesArray) {
			let [
				caregiverNames,
				clientNames
			] = namesArray;
			state.caregiverNames = caregiverNames;
			state.clientNames = clientNames;
		},
		SET_DIALOG(state, dialogStatus) {
			state.eventOpen = dialogStatus;
		},
		ADD_EVENT(state, payload) {
			state.events.push(payload);
			state.newEventSignal = true;
		},
		UPDATE_EVENT(state, { index, updatedEvent }) {
			state.events.splice(index, 1, updatedEvent);
			state.newEventSignal = true;
		},
		DELETE_EVENTS_MULTIPLE(state, eventsFound) {
			state.events = state.events.filter((ev) => !eventsFound.includes(ev));
			state.newEventSignal = true;
		},
		ADD_EXCEPTION(state, payload) {
			state.exceptions.push(payload);
			state.newEventSignal = true;
		},
		UPDATE_EXCEPTION(state, { index, payload }) {
			state.exceptions.splice(index, 1, payload);
			state.newEventSignal = true;
		},
		DELETE_EXCEPTION(state, index) {
			state.exceptions.splice(index, 1);
			state.newEventSignal = true;
		}
	},
	getters    : {
		getInstances              : (state) => (focus, name, type) => {
			return state.instances;
		},
		getExceptions             : (state) => (focus, name, type) => {
			return state.exceptions;
		},
		eventOpen                 : (state) => state.eventOpen,
		getNamesCaregivers        : (state) => state.caregiverNames,
		getNamesClients           : (state) => state.clientNames,
		newEventSignal            : (state) => state.newEventSignal,
		getSelectedPerson         : (state) => state.selectedPerson,
		getCurrentEvent           : (state) => (data) => {
			return state.instances.find((element) => {
				return element.cal_id === data.cal_id && element.start === data.start;
			});
		},
		getIndexEvent             : (state) => (data) => {
			return state.events.findIndex((element) => {
				return element.cal_id === data.cal_id;
			});
		},
		getIndexException         : (state) => (data) => {
			return state.exceptions.findIndex((element) => {
				return element.cal_id === data.cal_id;
			});
		},
		getIndexExceptionDiverged : (state) => (data) => {
			return state.exceptions.findIndex((element) => {
				return element.cal_id === data.cal_id && element.actionType.originalData.start === data.start;
			});
		},
		getNames                  : (state, getters) => (current, type) => {
			return [
				...new Set(
					getters
						.getInstances(current, '', '')
						.filter((event) => {
							return event.start.includes(getFocus(current));
						})
						.map((event) => event[type])
						.sort((a, b) => {
							return a.split(' ')[1].localeCompare(b.split(' ')[1]);
						})
				)
			];
		},
	}
};

export default storeCalendar;
