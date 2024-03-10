import { RRule, RRuleSet, rrulestr } from 'rrule';
import { format, parseISO, differenceInMinutes, addMinutes, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { DateTime } from 'luxon';

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

/**
 * Get all possible names in view 
 * @param {Array} allEvents - All events in view
 * @param {string} current - The month to filter the names by
 * @param {string} type - caregiver or client
 * @return {Array}
 */
export function getNamesInView(allEvents, current, type) {
	return [
		...new Set(
			allEvents
				.filter((event) => {
					return event.start.includes(getFocus(current));
				})
				.map((event) => event[type])
				.sort((a, b) => {
					return a.split(' ')[1].localeCompare(b.split(' ')[1]);
				})
		)
	];
}

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
		let exceptionFound = exceptionArray.some((exception) => exception.cal_id === allEvents[index].cal_id && exception.actionType.originalData.start === allEvents[index].start);
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
	let recurringEvents = [];
	let year = parseISO(focus).getFullYear();
	let monthUTC = new Date(focus).getUTCMonth();
	let day = payload.start.substr(8, 2);

	// Subtract timezone offset to get the correct recurring start day and recurring end day used in .between function in recurDates
	let startDate = new Date(year, monthUTC, 1);
	let recurStart = new Date(startDate.valueOf() - startDate.getTimezoneOffset() * 60 * 1000);
	let endDate = endOfMonth(new Date(year, monthUTC));
	let recurEnd = new Date(endDate.valueOf() - endDate.getTimezoneOffset() * 60 * 1000);

	// Crossover check - Check if shift crosses over to next day. Example: 23:00 - 05:00. If it does cross over, the end time is calculated by adding difference in minutes from start time. If the event does not cross over to next day, end time is the same date + end time.

	let startDateOnly = payload.start.slice(0, 10);
	let endDateOnly = payload.end.slice(0, 10);
	let endTimeOnly = payload.end.slice(11);
	let diffMinutes = '';
	let crossesOverNextDay = startDateOnly !== endDateOnly;

	if (crossesOverNextDay) {
		diffMinutes = Math.abs(differenceInMinutes(parseISO(payload.start), parseISO(payload.end)));
	}
	// end Crossover check

	let recurDates = rrulestr(rruleString)
		.between(recurStart, recurEnd)
		.map((date) => format(DateTime.fromJSDate(date).toUTC().setZone('local', { keepLocalTime: true }).toJSDate(), 'yyyy-MM-dd HH:mm'));

	for (let recurDate of recurDates) {
		let date = recurDate.slice(0, 10);

		// Crossover check
		let endTimeDate = !crossesOverNextDay ? date + ' ' + endTimeOnly : format(addMinutes(parseISO(recurDate), diffMinutes), 'yyyy-MM-dd HH:mm');

		let tmpObj = { ...payload };
		tmpObj.start = recurDate;
		tmpObj.end = endTimeDate;
		recurringEvents.push(tmpObj);
	}

	return recurringEvents;
}
