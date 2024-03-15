import { RRule, RRuleSet, rrulestr } from 'rrule';
import { format, parseISO, differenceInMinutes, addMinutes, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { DateTime } from 'luxon';

import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../main.js';

export function leadingZero(num) {
	return ('0' + num).slice(-2);
}

/**
 * Get the current focus in yyyy-mm format
 * @param {String} focus 
 * @return {String}
 */
export function getFocus(focus) {
	if (!focus || focus === '') {
		return `${new Date().getFullYear()}-${leadingZero(new Date().getMonth() + 1)}`;
	}
	return focus.substr(0, 7);
}

// ================================================================================= //

// ♻️ Success: Returns unique names in the Sidebar.

export function getNamesInView(allEvents, current, type) {
	try {
		const focusedMonth = getFocus(current);
        const filteredEvents = allEvents.filter((event) => {
            return event.start.includes(focusedMonth);
        });
        const names = filteredEvents.flatMap((event) => {
            if (Array.isArray(event[type])) {
                return event[type].map(participant => participant.name);
            } else {
                return [];
            }
        });
        const sortedNames = names.sort((a, b) => {
            return a.split(' ')[1].localeCompare(b.split(' ')[1]);
        });
        const uniqueNames = [...new Set(sortedNames)];
		console.log("[storeCalendarHelpers.js/getNamesInView/uniqueNames]: ", uniqueNames);
        return uniqueNames;
	}  catch (error) {
		console.error(`Error in getNamesInView: ${error}`);
		throw error;
	}
}

// ================================================================================= //

/**
 * Change the event's until time to newEndDate. Used in updating events going forward and deleting events going forward
 * @param {Object} eventToStop - The recurring event to stop
 * @param {string} newEndDate - The end date to stop this recurring event
 * @return {Object}
 */
export function changeRecurringEnd(eventToStop, newEndDate) {
	// Keep a reference to the old UNTIL date to replace
	let copyEvent = { ...eventToStop };
	let oldEventUntilDate = eventToStop.rruleString.substr(eventToStop.rruleString.search('UNTIL=') + 6, 8);

	// Get the start of this new recurrence to replace it with the end of previous recurring event end date
	let [
		year,
		month,
		day
	] = newEndDate.substr(0, 10).split('-');

	// Exclude the last day of recurrence by subtracting 1 day
	let endDateNew = format(addDays(new Date(year, month - 1, day), -1), 'yyyyMMdd');

	// Replace the old until date to a new one
	copyEvent.rruleString = copyEvent.rruleString.replace(oldEventUntilDate, endDateNew);
	return copyEvent;
}

/**
 * Create all instances of events 
 * @param {Object} events 
 * @param {Object} focus 
 * @param {Object} name 
 * @param {Object} type 
 * @return {Array}
 */
export function createAllEvents(events, exceptionArray, focus, name, type) {
	let allEvents = [];

	// Create all recurring instances within month using RRULE string
	events.map((item) => {
		allEvents = [
			...allEvents,
			...makeRecurringEvents(item, item.rruleString, getFocus(focus))
		];
	});

	// Loop through recurring events while omitting any instances from recurring events if a matching exception is found in exceptions.
	let index = allEvents.length - 1;
	while (index >= 0) {
		let exceptionFound = exceptionArray.some((exception) => exception.id === allEvents[index].id && exception.actionType.originalData.start === allEvents[index].start);
		if (exceptionFound) {
			allEvents.splice(index, 1);
		}
		index -= 1;
	}

	// Get all one time events and diverged events except recurring instances that have been deleted
	let oneTimeEventsAndDivergedEvents = exceptionArray.filter((ex) => {
		if (ex.actionType && ex.actionType.description === 'deleteInstance') {
			// Exclude recurring event instances that has been deleted
			return;
		}
		return ex;
	});

	// Combine recurring events array and one time/diverged events array
	allEvents = [
		...allEvents,
		...oneTimeEventsAndDivergedEvents
	];

	return allEvents;
}

/**
 * Create recurring events from RRule 
 * @param {Object} payload 
 * @param {String} rruleString 
 * @param {String} focus 
 * @return {Array}
 */
export function makeRecurringEvents(payload, rruleString, focus) {

	// Data: []
	let recurringEvents = [];
	
	// Data: 2024
	let year = parseISO(focus).getFullYear();
	
	// Data: 2
	let monthUTC = new Date(focus).getUTCMonth();
	
	// Data: 12
	let day = payload.start.substr(8, 2);
	
	// Data: "2024-03-01T06:00:00.000Z"
	let startDate = new Date(year, monthUTC, 1);
	
	// Data: "2024-03-01T00:00:00.000Z"
	let recurStart = new Date(startDate.valueOf() - startDate.getTimezoneOffset() * 60 * 1000);
	
	// Data: "2024-04-01T04:59:59.999Z"
	let endDate = endOfMonth(new Date(year, monthUTC));
	
	// Data: "2024-03-31T23:59:59.999Z"
	let recurEnd = new Date(endDate.valueOf() - endDate.getTimezoneOffset() * 60 * 1000);

	// Data: "2024-03-12"
	let startDateOnly = payload.start.slice(0, 10);

	// Data: "2024-03-12"
	let endDateOnly = payload.end.slice(0, 10);

	// Data: "16:00"
	let endTimeOnly = payload.end.slice(11);

	// Data: ""
	let diffMinutes = '';

	// Data: false
	let crossesOverNextDay = startDateOnly !== endDateOnly;

	if (crossesOverNextDay) {
		// Data: ""
		diffMinutes = Math.abs(differenceInMinutes(parseISO(payload.start), parseISO(payload.end)));
	}

	let recurDates = rrulestr(rruleString)
		.between(recurStart, recurEnd)
		.map((date) => format(
			DateTime.fromJSDate(date).toUTC().setZone('local', { 
				keepLocalTime: true 
			}).toJSDate(), 'yyyy-MM-dd HH:mm'));

	for (let recurDate of recurDates) {
		let date = recurDate.slice(0, 10);
		let endTimeDate = !crossesOverNextDay ? date + ' ' + endTimeOnly : format(
			addMinutes(parseISO(recurDate), diffMinutes), 
			'yyyy-MM-dd HH:mm'
		);
		let tmpObj = { ...payload };
		tmpObj.start = recurDate;
		tmpObj.end = endTimeDate;
		recurringEvents.push(tmpObj);
	}

	return recurringEvents;
}

// =================================================================================== //

export async function handleNonRecurringShift({ commit, state, getters }, payload) {
    console.log("[storeCalendarHelpers.js/handleNonRecurringShift]: Starting with payload:", payload);
    try {
        if (!payload.actionType || payload.actionType.description === 'updateInstance') {
            console.log("[storeCalendarHelpers.js/handleNonRecurringShift]: Handling as one-time shift.");
            await deleteOneTimeShift({ commit, state, getters }, payload);
        } else {
            console.log("[storeCalendarHelpers.js/handleNonRecurringShift]: Handling as diverged shift.");
            await deleteDivergedShift({ commit, state, getters }, payload);
        }
        console.log("[storeCalendarHelpers.js/handleNonRecurringShift]: Successfully processed non-recurring shift.");
    } catch (error) {
        console.error("[storeCalendarHelpers.js/handleNonRecurringShift]: Error processing non-recurring shift:", error);
        throw error;
    }
}

// =================================================================================== //

async function deleteOneTimeShift({ commit, state, getters }, payload) {
    console.log("[storeCalendarHelpers.js/deleteOneTimeShift]: Starting with payload:", payload);
    try {
        let exceptionIndex = getters.getIndexException(payload);
        if (exceptionIndex !== -1) {
            console.log(`[storeCalendarHelpers.js/deleteOneTimeShift]: Deleting exception at index ${exceptionIndex}.`);
            await deleteDoc(doc(db, "exceptions", state.exceptions[exceptionIndex].id));
            commit('DELETE_EXCEPTION', exceptionIndex);
            console.log("[storeCalendarHelpers.js/deleteOneTimeShift]: Exception deleted successfully.");
        } else {
            console.log("[storeCalendarHelpers.js/deleteOneTimeShift]: No matching exception found.");
        }
    } catch (error) {
        console.error("[storeCalendarHelpers.js/deleteOneTimeShift]: Error deleting one-time shift:", error);
        throw error; // Rethrow the error for further handling.
    }
}

// =================================================================================== //

export async function handleRecurringShift({ commit, state, getters, dispatch }, payload) {
    switch (payload.actionType.description) {
        case 'deleteAll':
            await deleteAllRecurringShifts({ commit, state }, payload);
            break;
        case 'deleteForward':
            await deleteForwardRecurringShift({ commit, state, getters }, payload);
            break;
        case 'deleteInstance':
            await deleteSingleRecurringInstance({ commit }, payload);
            break;
        default:
            dispatch('updateSnackMessage', 'Unknown actionType for recurring shift', { root: true });
    }
}

// =================================================================================== //

// 🔸 Unknown: Need to see how to target this, unable to console log.

async function deleteDivergedShift({ commit, state, getters }, payload) {
    try {
        console.log('Starting deleteDivergedShift with payload:', payload); // Logs the beginning of the function execution and shows the payload.
        let index = getters.getIndexExceptionDiverged(payload); // Retrieves the index of the diverged shift exception based on the payload.
        console.log('Index of diverged shift exception:', index); // Logs the index of the found exception.
        if (index !== -1) { // Checks if the exception was found.
            await deleteDoc(doc(db, "exceptions", state.exceptions[index].id)); // Deletes the exception document from Firestore.
            console.log(`Deleted diverged shift exception with ID: ${state.exceptions[index].id}`); // Logs the ID of the exception that was deleted.
            commit('DELETE_EXCEPTION', index); // Commits the deletion of the exception to the Vuex store.
            console.log('Diverged shift exception deleted successfully'); // Logs a success message after the exception is deleted.
        } else {
            console.log('No matching diverged shift exception found to delete'); // Logs a message if no matching exception is found.
        }
    } catch (error) {
        console.error('Error in deleteDivergedShift:', error); // Logs any errors that occur during the execution of the function.
        throw error; // Rethrows the caught error for further handling.
    }
}

// =================================================================================== //

// ♻️ Success: Create Recurring Shift every "Monday" -> Create Recurring Shift every "Tuesday" -> "Delete all Instance" on Monday -> "Tuesday" is not impacted.

async function deleteAllRecurringShifts({ commit, state }, payload) {
    try {
        console.log('Starting deleteAllRecurringShifts with payload:', payload); // Logs the beginning of the function execution and shows the payload.
        let shiftsFound = state.events.filter(element => element.id === payload.id); // Filters the events to find those matching the payload's id.
        console.log(`Found ${shiftsFound.length} shifts to delete.`); // Logs the number of shifts found to delete.
        for (let shift of shiftsFound) {
            await deleteDoc(doc(db, "events", shift.id)); // Deletes each found shift document from Firestore.
            console.log(`Deleted shift with ID: ${shift.id}`); // Logs the ID of the shift that was deleted.
        }
        commit('DELETE_EVENTS_MULTIPLE', shiftsFound); // Commits the deletion of multiple events to the Vuex store.
        console.log('All specified shifts have been deleted.'); // Logs a success message after all specified shifts are deleted.
    } catch (error) {
        console.error('Error in deleteAllRecurringShifts:', error); // Logs any errors that occur during the execution of the function.
        throw error; // Rethrows the caught error for further handling.
    }
}

// =================================================================================== //

// 🔺 Error: It deletes the current event also, which it should not.

async function deleteForwardRecurringShift({ commit, state, getters }, payload) {
    try {
        console.log('Starting deleteForwardRecurringShift with payload:', payload);
        let index = getters.getIndexEvent(payload);
        console.log('Index of event to update:', index);
        if (index !== -1) {
            let updatedShift = changeRecurringEnd({ ...state.events[index] }, payload.start);
            console.log('Updated shift details:', updatedShift);
            await updateDoc(doc(db, "events", state.events[index].id), updatedShift);
            commit('UPDATE_EVENT', { index, updatedEvent: updatedShift });
            console.log('Shift updated successfully');
        } else {
            console.log('No matching event found to update');
        }
    } catch (error) {
        console.error('Error in deleteForwardRecurringShift:', error);
        throw error; // Rethrow the error if you want to handle it further up the call stack
    }
}

// =================================================================================== //

// ♻️ Success: Click Recurring Shift -> "Delete this instance" -> Single instance is deleted.

// Usage: Recurring Event Dialog -> Delete this instance.
async function deleteSingleRecurringInstance({ commit }, payload) { // payload is the { id: } object.
    try {
        const exceptionDocRef = await addDoc(collection(db, "exceptions"), payload); // Adds a new document to the "exceptions" collection in Firestore with the given payload.
        payload.id = exceptionDocRef.id; // Updates the payload object with the ID of the newly created Firestore document.
        commit('ADD_EXCEPTION', payload); // Commits the updated payload to the Vuex store using the 'ADD_EXCEPTION' mutation.
        console.log('Payload after adding ID:', payload); // Logs the payload after it has been updated with the document ID.
    } catch (error) {
        console.error('Error in deleteSingleRecurringInstance:', error); // Logs any errors that occur during the execution of this function.
        throw error; // Rethrows the caught error for further handling.
    }
}