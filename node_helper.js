/* Magic Mirror
 * Node Helper: MMM-WmataBusSchedule
 *
 * By
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const moment = require('moment');
const axios = require('axios');

module.exports = NodeHelper.create({
  shouldWeFetchCommuteData: function(config) {
    /*
	    Usage: Parse config to determine if we should fetch data.
		  Params:
			  ::config:: the config object set in the main MM config.js file.
		  Returns: boolean value
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
		  Params:
			  ::config:: the config object set in the main MM config.js file.
		  Returns: Response object from WMATA API
		*/
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
      return {
        data: scheduleResponse.data,
        processor: 'processBusPredictorData',
        success: true
      };
    } else {
      return {
        status: scheduleResponse.status,
        success: false
      };
    }
  },
  fetchStopSchedule: async function(config) {
    /*
		  Usage: Hit the WMATA API to get the stop schedule
		  Params:
			  ::config:: the config object set in the main MM config.js file.
		  Returns: Response object from WMATA API
		*/
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
      return {
        data: sctopResponse.data,
        processor: 'processStopData',
        success: true
      };
    } else {
      return {
        status: sctopResponse.status,
        success: false
      };
    }
  },
  fetchTimeToWork: async function(config, destination) {
    /*
		  Usage: Hit the Google API to get the next bus
		  Params:
        ::config:: the config object set in the main MM config.js file.
        ::end:: The destination for this specific request.
		  Returns: Response object from Google directions API
		*/
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = {
      origin: `${config.places.home.lat},${config.places.home.lon}`,
      destination: `${destination.lat},${destination.lon}`,
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
      return {
        data: commuteResponse.data,
        name: end.name, // Bring the name of the destination for display
        processor: 'processCommuteData',
        success: true
      };
    } else {
      return {
        status: commuteResponse.status,
        success: false
      };
    }
  },
  socketNotificationReceived: async function(notification, payload) {
    /* 
    We listen to notifications from the main module, which will
    tell us when to reach out the the APIs for updates to the data.
    */

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
      const weShouldFetchCommuteData = this.shouldWeFetchCommuteData(payload);
      if (weShouldFetchCommuteData) {
        /* 
          We will load up an array of promises to be completed before we
          process them and update the DOM.
         */
        let requests = [self.fetchNextBus(payload)];
        const now = moment();
        if (now.minute() % 5 === 0) {
          /* 
          Only fetch traffic info from google every 5 mins to avoid hitting the
          API rate limits and charging $$$
          */
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
          console.log('Error firing requests to Google/WMATA APIs!');
          console.log(err);
        }
      } else {
        console.log('We are not fetching - maybe we should do something else?');
      }
    }
  }
});
