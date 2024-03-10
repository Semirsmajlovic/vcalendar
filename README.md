# Vuetify Carendar
VCarendar is a calendar scheduler tailored for scheduling caregivers to clients made with Vuetify. It supports recurring events, one time events, calculation of total hours/shifts and outputting the calendar as a PDF 

## Demo

[Online Demo](https://marknakajima.github.io/vcarendar/)

![](https://github.com/marknakajima/public_assets/blob/master/images/vcarendar/carendar_gif.gif)

## Features
- Set recurring events such as "Every week on Thursday & Friday at 9am to 4pm", "Every other week on Monday at 12pm to 9pm" using RRule
- Set one time events
- Vuex state management
- Filter events by caregiver or client
- Output schedule to PDF format
- Shows calculation of total hours and event count
- Update recurring events by instance only, update going forward or update all instances
- Delete recurring events by instance only, delete going forward or delete all instances
- Monthly, weekly, 4days and day view
- End time automatically calculated by inputting start time and duration
- Material design with Vuetify

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Special thanks

- [https://github.com/bmoeskau/Extensible/blob/master/recurrence-overview.md](https://github.com/bmoeskau/Extensible/blob/master/recurrence-overview.md)



### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
