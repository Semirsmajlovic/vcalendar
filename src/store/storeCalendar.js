import { 
	getFocus, 
	getNamesInView, 
	changeRecurringEnd, 
	createAllEvents
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
	actions: {
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

				let allEvents = createAllEvents(
					events,
					exceptions,
					getFocus(payload.focus),
					'',
					''
				);

				// Get all unique names for caregivers and clients to show in CalendarSideBar.vue
				let cgNames = getNamesInView(allEvents, payload.focus, 'volunteerNames'); // Previous: caregiver
				let clNames = getNamesInView(allEvents, payload.focus, 'driverHelperNames'); // Previous: client

				// Set the names.
				commit('SET_NAMES', [
					cgNames,
					clNames
				]);

				/*
					payload: {
						focus: ""
						name: "Semir 1"
						type: "volunteerNames"
					}
				*/
				let { name, type } = payload;

				// If name and type is provided, filter allEvents to that participant only

				console.log("UNFILTERED:", allEvents)

				console.log("FILTER NAME:", name)

				if (name || type) {
					allEvents = allEvents.filter((event) => {
						console.log("FILTERING", event[type])
						let isVolunteerMatching = false

						for (var volunteer of event[type]) {
							if (volunteer.name == name) {
								isVolunteerMatching = true
							}
						}

						return isVolunteerMatching;
					});
				}

				console.log("FILTERED:", allEvents)

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
					commit('ADD_SHIFT', payload); // Commit the change
				}
			} catch (e) {
				console.error("[storeCalendar.js/actionCreateNewEvent]: Error adding document: ", e);
				dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
			}
		},


		
		async updateEvent({ commit, state, getters, dispatch }, payload) {
			let docRef;
			if (!payload.isRecurring) {
				if (!payload.actionType) {
					// Update one-time event
					try {
						let exceptionIndex = getters.getIndexException(payload);
						if (exceptionIndex !== -1) {
							docRef = doc(db, "exceptions", payload.id); // Assuming payload.id is the Firestore document ID
							await updateDoc(docRef, payload);
							commit('UPDATE_EXCEPTION', {
								exceptionIndex,
								payload
							});
						}
					} catch (e) {
						dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
					}
				} else {
					// Update recurring event to one-time event.
					try {
						let divergedIndex = getters.getIndexExceptionDiverged(payload);
						if (divergedIndex !== -1) {
							docRef = doc(db, "exceptions", payload.id); // Assuming payload.id is the Firestore document ID
							await updateDoc(docRef, payload);
							commit('UPDATE_EXCEPTION', {
								divergedIndex,
								payload
							});
						}
					} catch(e) {
						dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
					}
				}
			} else {
				switch (payload.actionType.description) {
					case 'updateAll': {

						try {
							let index = getters.getIndexEvent(payload);
							if (index !== -1) {
								docRef = doc(db, "events", payload.id); // Assuming payload.id is the Firestore document ID
								let updatedShift = { ...payload };
								await updateDoc(docRef, payload);
								commit('UPDATE_SHIFT', { index, updatedShift });
							}
						} catch(e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
						break;
					}
					case 'updateInstance': {
						payload.actionType.description = 'updateInstance';
						payload.isRecurring = false;
						payload.rruleString = '';
						const exceptionDocRef = await addDoc(collection(db, "exceptions"), payload);
						payload.id = exceptionDocRef.id;
						commit('ADD_EXCEPTION', payload);
						break;
					}
					case 'updateForward': {
						try {
								let index = getters.getIndexEvent(payload);
								let updatedShift = changeRecurringEnd({ ...state.events[index] }, payload.start);
								let originalDocRef = doc(db, "events", state.events[index].id);
								await updateDoc(originalDocRef, updatedShift);
								commit('UPDATE_SHIFT', { index, updatedShift }); // Reflect the update in Vuex state
					
								// Create a new event for the forward part
								let recurringObjGoingForward = { ...payload };
								delete recurringObjGoingForward.id; // Ensure a new ID is generated by Firestore
								const newEventDocRef = await addDoc(collection(db, "events"), recurringObjGoingForward);
								recurringObjGoingForward.id = newEventDocRef.id; // Update with new Firestore document ID
								commit('ADD_SHIFT', recurringObjGoingForward); // Add the new event to Vuex state
						} catch (e) {
							console.error("Error in updateForward: ", e);
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
			try {
				console.log("HELLO DELETE")
				if (!payload.isRecurring) {
					console.log("DELETE REC")
					if (!payload.actionType) {
						try {
							// console.log("WHEN THIS DELETE iS CALLED 1")
							let exceptionIndex = getters.getIndexException(payload);
							await deleteDoc(doc(db, "exceptions", state.exceptions[exceptionIndex].id));
							commit('DELETE_EXCEPTION', exceptionIndex);
						} catch(e) {
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
					} else {
						console.log("WHEN THIS DELETE iS CALLED")
						try {
							let index = getters.getIndexExceptionDiverged(payload)

							console.log("Deleting Exception", state.exceptions)
							console.log("Deleting id", state.exceptions[index].id)
							console.log("Deleting index", index)

							// var exceptionDeleteQuery = await db.collection('exceptions').where('id','==', payload.id);
							var exceptionDeleteQuery = collection(db, 'exceptions');
							var querySnapshot = await getDocs(exceptionDeleteQuery);
							
							querySnapshot.forEach((doc) => {
							  if (doc.data().id === payload.id) {
								deleteDoc(doc.ref);
							  }
							});

							payload.actionType.description = 'deleteInstance';
							// await deleteDoc(doc(db, "exceptions", state.exceptions[index].id));
							commit('DELETE_EXCEPTION', index);
							commit('UPDATE_EXCEPTION', { index, payload });
						} catch(e) {
							console.log("ERROR", e)
							dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
						}
					}
				} else {
					switch (payload.actionType.description) {
						case 'deleteAll':
							try {
								let shiftsFound = state.events.filter(element => element.id === payload.id);
								for (let shift of shiftsFound) {
									await deleteDoc(doc(db, "events", shift.id));
								}
								commit('DELETE_EVENTS_MULTIPLE', shiftsFound);
							} catch (error) {
								dispatch('updateSnackMessage', `Error with ${error}`, { root: true });
							}
							break;
						case 'deleteForward':
							try {
								let index = getters.getIndexEvent(payload);
								let updatedShift = changeRecurringEnd({ ...state.events[index] }, payload.start);
								await updateDoc(doc(db, "events", state.events[index].id), updatedShift);
								commit('UPDATE_SHIFT', { index, updatedShift: updatedShift });
							} catch (e) {
								dispatch('updateSnackMessage', `Error with ${e}`, { root: true });
							}
							break;
						case 'deleteInstance':
							try {
								const exceptionDocRef = await addDoc(collection(db, "exceptions"), payload);
								payload.id = exceptionDocRef.id;
								payload.actionType.description = 'deleteInstance';
								commit('ADD_EXCEPTION', payload);
							} catch (error) {
								console.error('Error in deleteSingleRecurringInstance:', error);
								throw error;
							}
							break;
						default:
							dispatch('updateSnackMessage', 'Unknown actionType for recurring shift', { root: true });
					}
				}
			} catch (e) {
				console.error("[storeCalendar.js/deleteEvent]: Error processing shift: ", e);
				dispatch('updateSnackMessage', `Operation failed: ${e.message}`, { root: true });
			}
		},



		// Previous: updateSelectedPerson | 1 Instance old file | 1 Instance this file.
		updateSelectedParticipant({ commit, state }, participant) {
			commit('SET_PARTICIPANT', participant);
		},
		adminShiftDialogOpen({ commit, state }, dialogStatus) {
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
		ADD_SHIFT(state, payload) {
			state.events.push(payload);
			state.newEventSignal = true;
		},
		UPDATE_SHIFT(state, { index, updatedShift }) {
			state.events.splice(index, 1, updatedShift);
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
	getters: {
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