/* Magic Mirror
 * Node Helper: MMM-WmataBusSchedule
 *
 * By
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const googleMapsClient = require('@google/maps');
const moment = require('moment');
const axios = require('axios');

module.exports = NodeHelper.create({
  shouldWeFetch: function(config) {
    /*
	  Usage: Parse config to determine if we should fetch data.
		 params:
			::config:: the config object set in the main MM config.js file.
		 returns: boolean value
	  */
    let shouldFetch = false;

    if ('schedule' in config) {
      const startTime = moment(config.schedule.times.start, 'HH:mm a');
      const endTime = moment(config.schedule.times.stop, 'HH:mm a');
      const now = moment();

      if (
        config.schedule.days.includes(now.day()) &&
        now.isBetween(startTime, endTime)
      ) {
        shouldFetch = true;
      }
    } else {
      // No schedule means fire all the time.
      shouldFetch = true;
    }

    return shouldFetch;
  },
  fetchNextBus: async function(config) {
    /*
		 Usage: Hit the WMATA API to get the next bus
		 params:
			::config:: the config object set in the main MM config.js file.
		 returns: Response object from WMATA API
		*/
    console.log('Calling bus schedule');
    const url = 'https://api.wmata.com/NextBusService.svc/json/jPredictions';
    const params = {
      StopID: config.busStopId,
      api_key: config.wmataId
    };
    const axiosConfig = {
      method: 'get',
      url: url,
      params: params
    };

    let scheduleResponse = await axios(axiosConfig);
    if (scheduleResponse.status == 200) {
      console.log('return the bus schedule');
      return {
        data: scheduleResponse.data,
        processor: 'processBusData',
        success: true
      };
    } else {
      console.log('This is broken.');
      return {
        status: scheduleResponse.status,
        success: false
      };
    }
  },
  fetchTimeToWork: async function(config) {
    /*
		 Usage: Hit the Google API to get the next bus
		 params:
			::config:: the config object set in the main MM config.js file.
		 returns: Response object from Google directions API
		*/
    console.log('Calling Google directions');
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = {
      origin: `${config.places.home.lat},${config.places.home.lon}`,
      destination: `${config.places.destination.lat},${
        config.places.destination.lon
      }`,
      key: config.googleApi,
      mode: 'transit'
    };
    const axiosConfig = {
      method: 'get',
      url: url,
      params: params
    };

    let commuteResponse = await axios(axiosConfig);
    if (commuteResponse.status == 200) {
      console.log('return the commute schedule');
      return {
        data: commuteResponse.data,
        processor: 'processCommuteData',
        success: true
      };
    } else {
      console.log('broken commute schedule');
      return {
        status: commuteResponse.status,
        success: false
      };
    }
  },
  socketNotificationReceived: async function(notification, payload) {
    const self = this;
    console.log(notification);
    if (notification === 'MMM-WmataBusSchedule-FETCH_BUS_SCHEDULE') {
      const weShouldFetch = this.shouldWeFetch(payload);
      if (weShouldFetch) {
        // Go fetch the data
        let requests = [self.fetchNextBus(payload)];

        const now = moment();
        if (now.minute() % 2 === 0) {
          // Only fetch traffic info from google every 2 mins
          requests.push(self.fetchTimeToWork(payload));
        }

        try {
          let responses = await Promise.all(requests);
          this.sendSocketNotification(
            'MMM-WmataBusSchedule-COMMUTE_DATA',
            responses
          );
        } catch (err) {
          console.log('ERROR!');
          console.log(err);
        }
      } else {
        console.log('We are not fetching - maybe we should do something else.');
      }
    }
  }
});
