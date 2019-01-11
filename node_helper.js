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
  shouldWeFetchCommuteData: function(config) {
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
  fetchStopSchedule: async function(config) {
    /*
		 Usage: Hit the WMATA API to get the stop schedule
		 params:
			::config:: the config object set in the main MM config.js file.
		 returns: Response object from WMATA API
		*/
    console.log('Calling stop schedule');
    const url = 'https://api.wmata.com/Bus.svc/json/jStopSchedule';
    const params = {
      StopID: config.busStopId,
      api_key: config.wmataId
    };
    const axiosConfig = {
      method: 'get',
      url: url,
      params: params
    };

    let sctopResponse = await axios(axiosConfig);
    if (sctopResponse.status == 200) {
      console.log('return the stop schedule');
      return {
        data: sctopResponse.data,
        processor: 'processStopData',
        success: true
      };
    } else {
      console.log('This is broken.');
      return {
        status: sctopResponse.status,
        success: false
      };
    }
  },
  fetchTimeToWork: async function(config, end) {
    /*
		 Usage: Hit the Google API to get the next bus
		 params:
			::config:: the config object set in the main MM config.js file.
		 returns: Response object from Google directions API
		*/
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = {
      origin: `${config.places.home.lat},${config.places.home.lon}`,
      destination: `${end.lat},${end.lon}`,
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
        name: end.name,
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

    if (notification === 'MMM-WmataBusSchedule-FETCH_STOP_SCHEDULE') {
      // Update the bust stop info
      const stopSchedule = await this.fetchStopSchedule(payload);
      this.sendSocketNotification(
        'MMM-WmataBusSchedule-BUS_STOP_DATA',
        stopSchedule
      );
    }

    if (notification === 'MMM-WmataBusSchedule-FETCH_COMMUTE') {
      // Update the Commute schedule
      const weShouldFetchCommuteData = this.shouldWeFetchCommuteData(payload);
      if (weShouldFetchCommuteData) {
        // Go fetch the data
        let requests = [self.fetchNextBus(payload)];

        const now = moment();
        if (now.minute() % 2 === 0) {
          // Only fetch traffic info from google every 2 mins
          for (i = 0; i < payload.places.destinations.length; i++) {
            requests.push(
              self.fetchTimeToWork(payload, payload.places.destinations[i])
            );
          }
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
