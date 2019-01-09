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
Module.register("MMM-WmataBusSchedule", {
	defaults: {
		updateInterval: 60000,
		retryDelay: 5000,
		text: "Good morning beautiful."
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		var self = this;
		var dataRequest = null;
		var dataNotification = null;
		//Flag for check if module is loaded
		this.loaded = false;
		// Kick off the module
		this.updateBusSchedule(this)
		// Setup empty Bus data
		this.nextBusData = {}
		// setup empty commute data
		this.commuteData = {}
	},
	
	updateBusSchedule: function(self){
		self.sendSocketNotification('MMM-WmataBusSchedule-FETCH_BUS_SCHEDULE', self.config)
		setTimeout(self.updateBusSchedule, self.config.updateInterval, self)
	},
	getDom: function() {
		var self = this;	
		if (self.nextBusData) {
			console.log(`Dom reloaded, next bus data: ${this.nextBusData}`)
		}
		
		if (self.commuteData) {
			console.log(`Dom reloaded, commuter data: ${this.commuteData}`)
		}		
		// create element wrapper for show into the module
		var wrapper = document.createElement("div");
		wrapper.id = 'wmata-bus'
		wrapper.innerHTML = this.config.text
		return wrapper;
	},
	processBusData: function(data) {
		this.nextBusData = data
	},
	processCommuteData: function(data) {
		this.commuteData = data
	},
	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		const self = this
		if(notification === "MMM-WmataBusSchedule-NOTIFICATION_TEST") {
			// set dataNotification
			// this.dataNotification = payload;
			// this.updateDom();
		}
		
		if (notification === "MMM-WmataBusSchedule-COMMUTE_DATA") {
			payload.forEach(res => {
				if (res.success) {
					self[res.processor](res.data)
				}
			})
			
			this.updateDom();
		}
	},
});
