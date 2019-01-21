# MMM-WmataBusSchedule

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

It was developed to display bus commute information for DV area residents that use the WMATA bus system. It also provides estimated commute time to a configurable list of destinations using the DC=area mass transit system (Metro and metro bus).

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:

```js
var config = {
  modules: [
    {
      module: 'MMM-WmataBusSchedule',
      config: {
        wmataId: 'XXX',
        busStopId: 'xxxx',
        googleApi: 'xxxx',
        schedule: {
          // The days you want the module to display and poll for information
          days: [1, 2, 3, 4, 5],
          // A time range used to determine when to poll the APIs to update the module.
          times: {
            start: '07:30',
            stop: '09:30'
          }
        },
        places: {
          home: {
            // The starting point for the COMMUTE TIME widget, must be lat/long
            lat: xxx,
            lon: xxx
          },
          destinations: [
            // A list of destinations used to determine the commute time. Be sure to include a name attribute for display.
            {
              name: 'The Washington Post',
              lat: 38.9029607,
              lon: -77.0307196
            }
          ]
        }
      }
    }
  ]
};
```

## Configuration options

| Option    | Description                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| `option1` | _Required_ DESCRIPTION HERE                                                                                     |
| `option2` | _Optional_ DESCRIPTION HERE TOO <br><br>**Type:** `int`(milliseconds) <br>Default 60000 milliseconds (1 minute) |
