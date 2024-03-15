import { v4 as uuidv4 } from 'uuid';
import { 
	leadingZero, 
	getFocus, 
	getNamesInView, 
	changeRecurringEnd, 
	createAllEvents, 
	makeRecurringEvents,
	handleNonRecurringShift,
	handleRecurringShift
} from './storeCalendarHelpers';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../main.js';

const storeCalendar = {
	namespaced : true,
	state: {
		eventOpen: false, // Dialog open/closed status
		newEventSignal: false, // Signal to components that an event has been created or deleted to repopulate names
		volunteerNames: [], // Previous: caregiverNames | Names of all possible caregivers in view. Used in CalendarSideBar
		driverHelperNames: [], // Previous: clientNames | Names of all the clients in view in view. Used in CalendarSideBar
		selectedParticipant: {}, // Sets the calendar's view to this participant when clicking on names in CalendarSideBar
		instances: [], // All events shown in calendar view - calculated at runtime by combining state.events and state.exceptions
	},
	actions    : {
		async initInstances({ commit, dispatch }, payload) {
			try {

				// Fetch events from Firestore
				const eventsCollectionRef = collection(db, "events");
				const eventsSnapshot = await getDocs(eventsCollectionRef);
				const events = eventsSnapshot.docs.map(doc => {
					let data = doc.data();
					if (data.rruleString) {
						data.rruleString = data.rruleString.replace(/\\n/g, '\n');
					}
					return { id: doc.id, ...data };
				});
				console.log("[storeCalendar.js/initInstances/events]: ", events);

				// Fetch exceptions from Firestore
				const exceptionsCollectionRef = collection(db, "exceptions");
				const exceptionsSnapshot = await getDocs(exceptionsCollectionRef);
				const exceptions = exceptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				console.log("[storeCalendar.js/initInstances/exceptions]: ", exceptions);

				// Set the Vuex state.
				commit('SET_INIT_RECURRING_SHIFTS', events);
				commit('SET_INIT_EXCEPTIONS', exceptions);

				// 
				let allEvents = createAllEvents(
					events,
					exceptions,
					getFocus(payload.focus),
					'',
					''
				);
				console.log("[storeCalendar.js/initInstances/allEvents]: ", allEvents);

				// Get all unique names for caregivers and clients to show in CalendarSideBar.vue
				let cgNames = getNamesInView(allEvents, payload.focus, 'volunteerNames'); // Previous: caregiver
				let clNames = getNamesInView(allEvents, payload.focus, 'driverHelperNames'); // Previous: client

				// Set the names.
				commit('SET_NAMES', [
					cgNames,
					clNames
				]);

				// If name and type is provided, filter allEvents to that participant only
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



		async actionCreateNewEvent({ commit, dispatch }, payload) {
			try {
				let collectionRef; // Set the collectionRef
				if (!payload.isRecurring) { // Is payload {id: dfvf, caregiver: "", recurring: false} false?
					collectionRef = collection(db, "exceptions"); // Set as exceptions database.
				} else {
					collectionRef = collection(db, "events"); // Set as events database.
				}
				const plainPayload = { ...payload }; // Sets a plain object: {id: dfvf, caregiver: "", recurring: false}
				const docRef = await addDoc(collectionRef, plainPayload);
				payload.id = docRef.id; // Update the payload with the Firestore document ID
				if (!payload.isRecurring) { // Is payload an exception?
					commit('ADD_EXCEPTION', payload); // Commit the change
				} else {
					commit('ADD_EVENT', payload); // Commit the change
				}
			} catch (e) {
				console.error("[storeCalendar.js/actionCreateNewEvent]: Error adding document: ", e);
				dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
			}
		},


		
		async updateEvent({ commit, state, getters, dispatch }, payload) {
			try {
				let docRef;
				if (!payload.isRecurring) {
					// Handling non-recurring events (exceptions)
					let exceptionIndex = getters.getIndexException(payload);
					if (exceptionIndex !== -1) {
						docRef = doc(db, "exceptions", payload.id); // Assuming payload.id is the Firestore document ID
						await updateDoc(docRef, payload);
						commit('UPDATE_EXCEPTION', {
							exceptionIndex,
							payload
						});
					}
				} else {
					// Handling recurring events
					switch (payload.actionType.description) {
						case 'updateAll': {
							let index = getters.getIndexEvent(payload);
							if (index !== -1) {
								docRef = doc(db, "events", payload.id); // Assuming payload.id is the Firestore document ID
								await updateDoc(docRef, payload);
								commit('UPDATE_EVENT', { index, updatedEvent: payload });
							}
							break;
						}
						case 'updateInstance': {
							console.log("[storeCalendar.js/updateEvent/updateInstance]: Starting update for a single instance.");
							// For updating a single instance of a recurring event, it's treated as an exception
							payload.actionType.description = 'updateInstance';
							payload.isRecurring = false;
							payload.rruleString = '';
							const exceptionDocRef = await addDoc(collection(db, "exceptions"), payload);
							payload.id = exceptionDocRef.id; // Update payload with new Firestore document ID
							commit('ADD_EXCEPTION', payload);
							console.log("[storeCalendar.js/updateEvent/updateInstance]: Exception added for single instance update.");
							break;
						}
						case 'updateForward': {
							// Splitting the recurring event into two parts
							let index = getters.getIndexEvent(payload);
							if (index !== -1) {
								// Update the original event's UNTIL date
								let updatedEvent = changeRecurringEnd({ ...state.events[index] }, payload.start);
								let originalDocRef = doc(db, "events", state.events[index].id);
								await updateDoc(originalDocRef, updatedEvent);
						
								// Create a new event for the forward part
								let recurringObjGoingForward = { ...payload };
								delete recurringObjGoingForward.id; // Remove id if present, to avoid confusion
								const newEventDocRef = await addDoc(collection(db, "events"), recurringObjGoingForward);
								recurringObjGoingForward.id = newEventDocRef.id; // Update with new Firestore document ID
								commit('ADD_EVENT', recurringObjGoingForward);
							}
							break;
						}
						default:
							dispatch('updateSnackMessage', `Unknown actionType in updateEvent`, { root: true });
					}
				}
			} catch (e) {
				console.error("Error updating document: ", e);
				dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
			}
		},




		async deleteEvent({ commit, state, getters, dispatch }, payload) {
			console.log("[storeCalendar.js/deleteEvent]: Starting deleteEvent with payload:", payload);
			try {
				if (!payload.isRecurring) {
					console.log("[storeCalendar.js/deleteEvent]: Handling non-recurring event.");
					await handleNonRecurringShift({ commit, state, getters }, payload);
				} else {
					console.log("[storeCalendar.js/deleteEvent]: Handling recurring event.");
					await handleRecurringShift({ commit, state, getters, dispatch }, payload);
				}
				console.log("[storeCalendar.js/deleteEvent]: Successfully processed event deletion.");
			} catch (e) {
				console.error("[storeCalendar.js/deleteEvent]: Error processing shift: ", e);
				dispatch('updateSnackMessage', `Operation failed: ${e.message}`, { root: true });
			}
		},



		
		updateSelectedParticipant({ commit, state }, participant) {
			commit('SET_PARTICIPANT', participant);
		},
		dialogOpen({ commit, state }, dialogStatus) {
			commit('SET_DIALOG', dialogStatus);
		}
	},
	mutations  : {
		SET_INIT_INSTANCES(state, payload) {
			state.instances = payload;
		},
		SET_INIT_RECURRING_SHIFTS(state, payload) {
			state.events = payload;
		},
		SET_INIT_EXCEPTIONS(state, payload) {
			state.exceptions = payload;
		},
		SET_PARTICIPANT(state, participant) {
			state.selectedParticipant = participant;
		},
		SET_NEW_EVENT_SIGNAL(state, status) {
			state.newEventSignal = status;
		},
		SET_NAMES(state, namesArray) {
			let [
				volunteerNames = [], // Default to empty array if undefined
				driverHelperNames = [] // Default to empty array if undefined
			] = Array.isArray(namesArray) ? namesArray : [[], []]; // Ensure namesArray is an array
			state.volunteerNames = volunteerNames;
			state.driverHelperNames = driverHelperNames;
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
		getInstances: (state) => (focus, name, type) => {
			return state.instances;
		},
		getExceptions: (state) => (focus, name, type) => {
			return state.exceptions;
		},
		eventOpen: (state) => state.eventOpen,
		getNamesVolunteers: (state) => state.volunteerNames,
		getNamesDriverHelpers: (state) => state.driverHelperNames,
		newEventSignal: (state) => state.newEventSignal,
		getSelectedParticipant: (state) => state.selectedParticipant,
		getCurrentEvent: (state) => (data) => {
			return state.instances.find((element) => {
				return element.id === data.id && element.start === data.start;
			});
		},
		getIndexEvent: (state) => (data) => {
			return state.events.findIndex((element) => {
				return element.id === data.id;
			});
		},
		getIndexException: (state) => (data) => {
			return state.exceptions.findIndex((element) => {
				return element.id === data.id;
			});
		},
		getIndexExceptionDiverged: (state) => (data) => {
			return state.exceptions.findIndex((element) => {
				return element.id === data.id && element.actionType.originalData.start === data.start;
			});
		},
		getNames: (state, getters) => (current, type) => {
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