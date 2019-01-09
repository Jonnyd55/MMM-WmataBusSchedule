# MMM-WmataBusSchedule

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/).

Todo: Insert description here!

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
                busRoutes: ['7A', '7W'],
                googleApi: 'xxxx',
                schedule: {
                    days: [1, 2, 3, 4, 5],
                    times: {
                        start: '07:30',
                        stop: '09:30'
                    }
                },
                places: {
                    home: {
                        lat: xxx,
                        lon: xxx
                    },
                    destination: {
                        lat: xxx,
                        lon: xxx
                    }
                }
            }
        }
    ]
}
```

## Configuration options

| Option           | Description
|----------------- |-----------
| `option1`        | *Required* DESCRIPTION HERE
| `option2`        | *Optional* DESCRIPTION HERE TOO <br><br>**Type:** `int`(milliseconds) <br>Default 60000 milliseconds (1 minute)
