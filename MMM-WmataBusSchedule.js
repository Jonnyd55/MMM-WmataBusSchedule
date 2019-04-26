/* global Module */

/* Magic Mirror
 * Module: MMM-WmataBusSchedule
 *
 * By Jon Davenport
 * MIT Licensed.
 */

Module.register('MMM-WmataBusSchedule', {
  defaults: {
    updateCommuteInterval: 60000,
    updateStopInterval: 120000,
    retryDelay: 5000
  },
  requiresVersion: '2.1.0', // Required version of MagicMirror
  getStyles: function() {
    return ['MMM-WmataBusSchedule.css'];
  },
  getScripts: function() {
    return ['moment.js'];
  },

  start: function() {
    // lag for check if module is loaded
    this.loaded = false;
    // Begin Commute calls
    this.updateCommute(this);
    // Begin Bus Stop calls
    this.updateStopSchedule(this);
    // Setup empty Bus data
    this.nextBusData = {};
    // setup empty commute data
    this.commuteData = {};
    // Undefined commute object
    this.nextBusTime = undefined;
    // Flag to tear down DOM
    this.tearDown = false;
  },
  updateCommute: function(self) {
    self.sendSocketNotification(
      'MMM-WmataBusSchedule-FETCH_COMMUTE',
      self.config
    );
    setTimeout(self.updateCommute, self.config.updateCommuteInterval, self);
  },
  updateStopSchedule: function(self) {
    self.sendSocketNotification(
      'MMM-WmataBusSchedule-FETCH_STOP_SCHEDULE',
      self.config
    );
    setTimeout(self.updateStopSchedule, self.config.updateStopInterval, self);
  },
  getDom: function() {
    const self = this;
    let wrapper = document.createElement('div');
    wrapper.id = 'wmata-bus-schedule';

    if (this.tearDown) {
      wrapper.innerHTML = '';
    } else {
      let schedTable = document.createElement('table');
      schedTable.className = 'schedule';

      if (this.nextBusTime || this.nextBusPrediction) {
        let header = document.createElement('tr');
        let hedCell = document.createElement('th');
        hedCell.colSpan = '2';
        hedCell.innerText = 'Next Bus';
        header.appendChild(hedCell);
        schedTable.appendChild(header);
      }

      if (this.nextBusTime) {
        let nextScheduledBusRow = document.createElement('tr');
        nextScheduledBusRow.className = 'bright';

        let SchedTitleCol = document.createElement('td');
        SchedTitleCol.innerHTML = 'Scheduled';
        nextScheduledBusRow.appendChild(SchedTitleCol);

        let schedDataCol = document.createElement('td');
        schedDataCol.className = 'data-col';
        schedDataCol.innerHTML = `${this.nextBusTime.format('h:mm a')}`;
        nextScheduledBusRow.appendChild(schedDataCol);

        schedTable.appendChild(nextScheduledBusRow);
      }

      if (this.nextBusPrediction) {
        let predictionBusRow = document.createElement('tr');
        predictionBusRow.className = 'bright';

        let predictionTitleCol = document.createElement('td');
        predictionTitleCol.innerHTML = `Predicted (${
          this.nextBusPrediction.RouteID
        })`;
        predictionBusRow.appendChild(predictionTitleCol);

        let predictionDataCol = document.createElement('td');
        predictionDataCol.className = 'data-col';
        predictionDataCol.innerHTML = `${this.nextBusPrediction.Minutes} mins`;
        predictionBusRow.appendChild(predictionDataCol);

        schedTable.appendChild(predictionBusRow);
      }

      // Handle Commute data
      let commutes = Object.keys(self.commuteData);
      if (commutes.length) {
        let commuteRow = document.createElement('tr');
        let commuteCol = document.createElement('th');
        commuteCol.className = 'commute-header';
        commuteCol.colSpan = '2';
        commuteCol.innerText = 'Time to';
        commuteRow.appendChild(commuteCol);
        schedTable.appendChild(commuteRow);

        for (commute in self.commuteData) {
          let time =
            self.commuteData[commute]['routes'][0]['legs'][0]['duration'][
              'text'
            ];

          let destinationRow = document.createElement('tr');
          destinationRow.className = 'bright commute-row';
          let commTitleCol = document.createElement('td');
          commTitleCol.innerHTML = `${commute}`;
          destinationRow.appendChild(commTitleCol);

          let commDataCol = document.createElement('td');
          commDataCol.className = 'data-col';
          commDataCol.innerHTML = `${time}`;
          destinationRow.appendChild(commDataCol);

          schedTable.appendChild(destinationRow);
        }
      }

      wrapper.appendChild(schedTable);
    }

    return wrapper;
  },
  processBusPredictorData: function(response) {
    this.tearDown = false;
    if (response.data['Predictions'].length) {
      this.nextBusPrediction = response.data['Predictions'][0];
    }
  },
  processCommuteData: function(response) {
    this.tearDown = false;
    this.commuteData[response.name] = response.data;
  },
  updateNextBus: function() {
    this.tearDown = false;
    const self = this;
    if (self.busSchedule) {
      let now = moment();
      let nextBus;
      for (let i = 0; i < self.busSchedule.length; i++) {
        nextBus = moment(
          self.busSchedule[i]['ScheduleTime'],
          'YYYY-MM-DDTHH:mm:ss'
        );
        if (nextBus > now) {
          break;
        }
      }
      self.nextBusTime = nextBus;
    }
  },
  // socketNotificationReceived from helper
  socketNotificationReceived: function(notification, payload) {
    const self = this;
    if (notification === 'MMM-WmataBusSchedule-COMMUTE_DATA') {
      payload.forEach(response => {
        if (response.success) {
          // The value of processor set in the response determines
          // which processor to call
          self[response.processor](response);
        }
      });
      this.updateNextBus();
      this.updateDom();
    }

    if (notification === 'MMM-WmataBusSchedule-BUS_STOP_DATA') {
      this.busSchedule = payload.data.ScheduleArrivals;
      this.updateNextBus();
      this.updateDom();
    }

    if (notification == 'MMM-WmataBusSchedule-TEAR-DOWN-DOM') {
      console.log('Tear down the DOM');
      this.tearDown = true;
      this.updateDom();
    }
  }
});
