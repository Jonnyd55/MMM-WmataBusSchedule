/* global Module */

/* Magic Mirror
 * Module: MMM-WmataBusSchedule
 *
 * By
 * MIT Licensed.
 */

/*
 SOME NOTES:
 1. I need to send teh request to wmata once a minute, but only to
 * google maps once every 5 minutes.
 2. I only need to do this betwen the hours of 7:15 and 9 a.m. every
 Monday - Friday - then stop over the weekend.
 3. You can set a schedule in the config. Options should be
 Days ['Sun', 'Mon', 'Tue', 'Wed', 'Thu' , 'Fri', 'Sat']
 Schedule: { start: '', stop: ''}
 *

*/
Module.register('MMM-WmataBusSchedule', {
  defaults: {
    updateCommuteInterval: 60000,
    updateStopInterval: 120000,
    retryDelay: 5000
  },

  requiresVersion: '2.1.0', // Required version of MagicMirror

  start: function() {
    //Flag for check if module is loaded
    this.loaded = false;
    // Begin Commute calls
    this.updateCommute(this);
    // Begin Bus Stop calls
    this.updateStopSchedule(this);
    // Setup empty Bus data
    this.nextBusData = {};
    // setup empty commute data
    this.commuteData = {};
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
    var self = this;
    if (self.nextBusData) {
      console.log(`Dom reloaded, next bus data: ${this.nextBusData}`);
    }

    if (self.commuteData) {
      console.log(`Dom reloaded, commuter data: ${this.commuteData}`);
    }

    // create element wrapper for show into the module
    var wrapper = document.createElement('div');
    wrapper.id = 'wmata-bus';
    wrapper.innerHTML = `Currently Loading schedules...`;
    return wrapper;
  },
  processBusData: function(response) {
    this.nextBusData = response.data;
  },
  processCommuteData: function(response) {
    this.commuteData[response.name] = response.data;
  },
  processStopData: function(response) {
    this.stopSchedule = response;
    console.log(`STOP SZCHEDULE: ${JSON.stringify(this.stopSchedule)}`);
  },
  // socketNotificationReceived from helper
  socketNotificationReceived: function(notification, payload) {
    const self = this;
    if (notification === 'MMM-WmataBusSchedule-COMMUTE_DATA') {
      payload.forEach(response => {
        if (response.success) {
          // The value of processor set in the response determines which processor to call
          self[response.processor](response);
        }
      });

      this.updateDom();
    }

    if (notification === 'MMM-WmataBusSchedule-BUS_STOP_DATA') {
      this.processStopData(payload);
      this.updateDom();
    }
  }
});
