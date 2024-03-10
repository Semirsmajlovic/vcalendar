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
	},
	actions    : {
		async initInstances({ commit, dispatch }, payload) {
			try {
				const eventsCollectionRef = collection(db, "events");
				console.log("eventsCollectionRef:", eventsCollectionRef);

				const eventsSnapshot = await getDocs(eventsCollectionRef);
				console.log("eventsSnapshot:", eventsSnapshot);
				
				const events = eventsSnapshot.docs.map(doc => {
					let data = doc.data();
					console.log("data:", data);
					if (data.rruleString) {
						data.rruleString = data.rruleString.replace(/\\n/g, '\n');
					}
					return { id: doc.id, ...data };
				});
				console.log("eventsSnapshot.docs:", eventsSnapshot.docs);
				console.log("events:", events);

				// Fetch exceptions from Firestore
				const exceptionsCollectionRef = collection(db, "exceptions");
				const exceptionsSnapshot = await getDocs(exceptionsCollectionRef);
				const exceptions = exceptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

				commit('SET_INIT_EVENTS', events);
				commit('SET_INIT_EXCEPTIONS', exceptions);

				let allEvents = createAllEvents(
					events,
					exceptions,
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
		async actionCreateNewEvent({ commit, dispatch }, payload) {
			try {
				let collectionRef;
				if (!payload.isRecurring) {
					// Reference to the exceptions collection
					collectionRef = collection(db, "exceptions");
				} else {
					// Reference to the events collection
					collectionRef = collection(db, "events");
				}
				console.log("actionCreateNewEvent -> collectionRef:", collectionRef);
				
				// Ensure payload is a plain object
				const plainPayload = { ...payload };
		
				// Add the new document to Firestore
				const docRef = await addDoc(collectionRef, plainPayload);
				console.log("Document written with ID: ", docRef.id);
		
				// Update the payload with the Firestore document ID
				payload.id = docRef.id;
		
				// Commit the change again with the updated payload
				if (!payload.isRecurring) {
					commit('ADD_EXCEPTION', payload);
				} else {
					commit('ADD_EVENT', payload);
				}
		
			} catch (e) {
				console.error("Error adding document: ", e);
				dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
			}
		},
		async updateEvent({ commit, state, getters, dispatch }, payload) {
			try {
				console.log("updateEvent: " + payload);
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
								commit('UPDATE_EVENT', {
									index,
									updatedEvent: payload
								});
							}
							break;
						}
						case 'updateInstance': {
							// For updating a single instance of a recurring event, it's treated as an exception
							payload.actionType.description = 'updateInstance';
							payload.isRecurring = false;
							payload.rruleString = '';
							const exceptionDocRef = await addDoc(collection(db, "exceptions"), payload);
							payload.id = exceptionDocRef.id; // Update payload with new Firestore document ID
							commit('ADD_EXCEPTION', payload);
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
								let recurringObjGoingForward = { ...payload, cal_id: uuidv4() };
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
			try {
				if (!payload.isRecurring) {
					await handleNonRecurringShift({ commit, state, getters }, payload);
				} else {
					await handleRecurringShift({ commit, state, getters, dispatch }, payload);
				}
			} catch (e) {
				console.error("Error processing shift: ", e);
				dispatch('updateSnackMessage', `Operation failed: ${e.message}`, { root: true });
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
