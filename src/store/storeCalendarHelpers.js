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

		console.log("All Events", allEvents)

		console.log("NAMES", names)

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

	console.log("[storeCalendarHelpers.js/createAllEvents]: ", name);

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