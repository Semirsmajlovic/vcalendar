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
		emitRefreshAndResetNewEventState: false, // Signal to components that an event has been created or deleted to repopulate names
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

				// Fetch exceptions from Firestore
				const exceptionsCollectionRef = collection(db, "exceptions");
				const exceptionsSnapshot = await getDocs(exceptionsCollectionRef);
				const exceptions = exceptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
				// Return: ['Semir Smajlovic']
				let cgNames = getNamesInView(allEvents, payload.focus, 'volunteerNames'); // Previous: caregiver
				console.warn("[storeCalendar.js/cgNames]: ", cgNames);

				let clNames = getNamesInView(allEvents, payload.focus, 'driverHelperNames'); // Previous: client
				console.warn("[storeCalendar.js/clNames]: ", clNames);

				// Set the names.
				commit('SET_NAMES', [
					cgNames,
					clNames
				]);

				let { name, type } = payload;

				// If name and type is provided, filter allEvents to that participant only
				if (name || type) {
					allEvents = allEvents.filter((event) => {
						let isMatching = false;
						if (event[type] && Array.isArray(event[type])) { // Ensure the property exists and is an array
							for (var participant of event[type]) {
								if (participant.name == name) {
									isMatching = true;
								}
							}
						}
						return isMatching;
					});
				}
				commit('SET_INIT_INSTANCES', allEvents);
			} catch (e) {
				dispatch('updateSnackMessage', `Error at ${e}`, { root: true });
			}
		},

        // ===================================================================================== //
        // Actions - Asynchronous function used to commit mutations.

		// Execution:
        // - Step 2: The function "createAndSaveNewShift" in CalendarEventDialog.vue is triggered before this.
		async actionCreateNewEvent({ commit, dispatch }, payload) {
			const logPrefix = "[storeCalendar.js/actionCreateNewEvent]:";
			try {
				const collectionName = payload.isRecurring ? "events" : "exceptions";
				const collectionRef = collection(db, collectionName);
				const docRef = await addDoc(collectionRef, payload);
				payload.id = docRef.id;
				const mutationName = payload.isRecurring ? 'ADD_SHIFT' : 'ADD_EXCEPTION';
				commit(mutationName, payload);
			} catch (e) {
				console.error(`${logPrefix} Error adding document: ${e}`);
				dispatch('updateSnackMessage', `Error: ${e.message}`, { root: true });
			}
		},

        // ===================================================================================== //
        // Actions - Asynchronous function used to commit mutations.
		
		async updateEvent({ commit, state, getters, dispatch }, payload) {
			const logPrefix = "[storeCalendar.js/updateEvent]";
	
			// Helper to update a single, non-recurring event
			const updateSingleEvent = async (payload) => {
				const exceptionIndex = getters.getIndexException(payload);
				if (exceptionIndex !== -1) {
					const docRef = doc(db, "exceptions", payload.id);
					await updateDoc(docRef, payload);
					commit('UPDATE_EXCEPTION', { exceptionIndex, payload });
				}
			};
	
			// Helper to update a diverged event from a recurring series to a one-time event
			const updateDivergedEvent = async (payload) => {
				const divergedIndex = getters.getIndexExceptionDiverged(payload);
				if (divergedIndex !== -1) {
					const docRef = doc(db, "exceptions", payload.id);
					await updateDoc(docRef, payload);
					commit('UPDATE_EXCEPTION', { divergedIndex, payload });
				}
			};
	
			// Helper to update all instances of a recurring event
			const updateAllInstances = async (payload) => {
				const index = getters.getIndexEvent(payload);
				if (index !== -1) {
					const docRef = doc(db, "events", payload.id);
					await updateDoc(docRef, payload);
					commit('UPDATE_SHIFT', { index, updatedShift: { ...payload } });
				}
			};
	
			// Helper to update a single instance of a recurring event
			const updateSingleInstance = async (payload) => {
				payload.actionType.description = 'updateInstance';
				payload.isRecurring = false;
				payload.rruleString = '';
				const collectionRef = collection(db, 'exceptions');
				const docRef = await addDoc(collectionRef, payload);
				payload.eventRefId = payload.id;
				payload.id = docRef.id;
				const originalDocRef = doc(db, "exceptions", docRef.id);
				await updateDoc(originalDocRef, payload);
				commit('ADD_EXCEPTION', payload);
			};
	
			// Helper to update instances of a recurring event going forward
			const updateForwardInstances = async (payload) => {
				const forwardIndex = getters.getIndexEvent(payload);
				if (forwardIndex !== -1) {
					const updatedShift = changeRecurringEnd({ ...state.events[forwardIndex] }, payload.start);
					const originalDocRef = doc(db, "events", state.events[forwardIndex].id);
					await updateDoc(originalDocRef, updatedShift);
					commit('UPDATE_SHIFT', { index: forwardIndex, updatedShift });
					let recurringObjGoingForward = { ...payload, id: undefined };
					const newEventDocRef = await addDoc(collection(db, "events"), recurringObjGoingForward);
					commit('ADD_SHIFT', { ...recurringObjGoingForward, id: newEventDocRef.id });
				}
			};
	
			// Internal helper function to update non-recurring events
			const updateNonRecurringEvent = async (payload) => {
				if (!payload.actionType) {
					await updateSingleEvent(payload);
				} else {
					await updateDivergedEvent(payload);
				}
			};
	
			// Internal helper function to update recurring events
			const updateRecurringEvent = async (payload) => {
				switch (payload.actionType.description) {
					case 'updateAll':
						await updateAllInstances(payload);
						break;
					case 'updateInstance':
						await updateSingleInstance(payload);
						break;
					case 'updateForward':
						await updateForwardInstances(payload);
						break;
					default:
						console.warn(`${logPrefix} Unknown actionType: ${payload.actionType.description}`);
						dispatch('updateSnackMessage', `Unknown actionType in updateEvent`, { root: true });
				}
			};
	
			// Main logic to decide which helper function to call
			try {
				if (!payload.isRecurring) {
					await updateNonRecurringEvent(payload);
				} else {
					await updateRecurringEvent(payload);
				}
			} catch (e) {
				console.error(`${logPrefix} Error updating event: ${e}`);
				dispatch('updateSnackMessage', `Error: ${e.message}`, { root: true });
			}
		},

        // ===================================================================================== //
        // Actions - Asynchronous function used to commit mutations.

		async deleteEvent({ commit, state, getters, dispatch }, payload) {
			const logPrefix = "[storeCalendar.js/deleteEvent]";
	
			// Helper to delete a single, non-recurring event
			const deleteSingleEvent = async (payload) => {
				const exceptionIndex = getters.getIndexException(payload);
				if (exceptionIndex !== -1) {
					await deleteDoc(doc(db, "exceptions", state.exceptions[exceptionIndex].id));
					commit('DELETE_EXCEPTION', exceptionIndex);
				}
			};
	
			// Helper to update exception for a diverged instance
			const updateDivergedException = async (payload) => {
				const index = getters.getIndexExceptionDiverged(payload);
				if (index !== -1) {
					payload.actionType.description = 'deleteInstance';
					const docRef = doc(db, "exceptions", state.exceptions[index].id);
					await updateDoc(docRef, payload);
					commit('UPDATE_EXCEPTION', { index, payload });
				}
			};
	
			// Helper to delete all instances of a recurring event
			const deleteAllInstances = async (payload) => {
				const shiftsFound = state.events.filter(element => element.id === payload.id);
				for (let shift of shiftsFound) {
					await deleteDoc(doc(db, "events", shift.id));
				}
				commit('DELETE_EVENTS_MULTIPLE', shiftsFound);
			};
	
			// Helper to update recurring event going forward
			const updateRecurringEventForward = async (payload) => {
				const index = getters.getIndexEvent(payload);
				if (index !== -1) {
					const updatedShift = changeRecurringEnd({ ...state.events[index] }, payload.start);
					await updateDoc(doc(db, "events", state.events[index].id), updatedShift);
					commit('UPDATE_SHIFT', { index, updatedShift });
				}
			};
	
			// Helper to add exception for deleting a single instance
			const addExceptionForDeletion = async (payload) => {
				const exceptionDocRef = await addDoc(collection(db, "exceptions"), payload);
				payload.eventRefId=payload.id
				payload.id = exceptionDocRef.id;
				payload.actionType.description = 'deleteInstance';
				const originalDocRef = doc(db, "exceptions",  exceptionDocRef.id);
				await updateDoc(originalDocRef, payload);
				commit('ADD_EXCEPTION', payload);
			};
	
			// Main logic to decide which helper function to call
			try {
				if (!payload.isRecurring) {
					if (!payload.actionType) {
						await deleteSingleEvent(payload);
					} else {
						await updateDivergedException(payload);
					}
				} else {
					switch (payload.actionType.description) {
						case 'deleteAll':
							await deleteAllInstances(payload);
							break;
						case 'deleteForward':
							await updateRecurringEventForward(payload);
							break;
						case 'deleteInstance':
							await addExceptionForDeletion(payload);
							break;
						default:
							console.warn(`${logPrefix} Unknown actionType for recurring shift.`);
							dispatch('updateSnackMessage', 'Unknown actionType for recurring shift', { root: true });
					}
				}
			} catch (e) {
				console.error(`${logPrefix} Error processing event: ${e}`);
				dispatch('updateSnackMessage', `Operation failed: ${e.message}`, { root: true });
			}
		},

        // ===================================================================================== //
        // Actions - Asynchronous function used to commit mutations.

		// Execution:
		// - Select "All" or "Participant" inside the Sidebar.
		updateSelectedParticipant({ commit }, participant) {
			const logPrefix = "[storeCalendar.js/updateSelectedParticipant]:";
			try {
				commit('SET_PARTICIPANT', participant);
			} catch (error) {
				console.error(`${logPrefix} Error updating participant:`, error);
			}
		},

        // ===================================================================================== //
        // Actions - Asynchronous function used to commit mutations.

		// Execution:
		// - Open "Shift Dialog" -> Close "Shift Dialog".
		adminShiftDialogOpen({ commit }, dialogStatus) {
			const logPrefix = "[storeCalendar.js/adminShiftDialogOpen]:";
			try {
				commit('SET_DIALOG', dialogStatus);
			} catch (error) {
				console.error(`${logPrefix} Error updating dialog status:`, error);
			}
		},

        // ===================================================================================== //
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
			state.emitRefreshAndResetNewEventState = status;
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
			state.emitRefreshAndResetNewEventState = true;
		},
		UPDATE_SHIFT(state, { index, updatedShift }) {
			state.events.splice(index, 1, updatedShift);
			state.emitRefreshAndResetNewEventState = true;
		},
		DELETE_EVENTS_MULTIPLE(state, eventsFound) {
			state.events = state.events.filter((ev) => !eventsFound.includes(ev));
			state.emitRefreshAndResetNewEventState = true;
		},
		ADD_EXCEPTION(state, payload) {
			state.exceptions.push(payload);
			state.emitRefreshAndResetNewEventState = true;
		},
		UPDATE_EXCEPTION(state, { index, payload }) {
			state.exceptions.splice(index, 1, payload);
			state.emitRefreshAndResetNewEventState = true;
		},
		DELETE_EXCEPTION(state, index) {
			state.exceptions.splice(index, 1);
			state.emitRefreshAndResetNewEventState = true;
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
		emitRefreshAndResetNewEventState: (state) => state.emitRefreshAndResetNewEventState,


		getNamesVolunteers: (state) => state.volunteerNames,
		getNamesDriverHelpers: (state) => state.driverHelperNames,
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