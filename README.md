# ![DAQari](https://github.com/nravanelli/DAQari/blob/main/images/logo.svg) DAQari

A simple browser-based DAQ software using WebSerial &amp; FileSystem Access API's

**DAQari** was born from my need for a simple data acquisition software that could read 16 Analog signals at ~0.2Hz (or every 5 seconds) passed through an ADC Arduino shield. It is not as sophisticated as products from LabChart, LabView, or MATlab. However, if all you need is analog (or digital) inputs that can be ingested by an Arduino board and at low frequency (eg < 200 Hz), this is more than sufficient. Considering that commercial options cost many $1000's, a simple DAQ unit can be built for < $30 with 8 10-bit analog inputs. Moreover, you can have multiple instances of **DAQari** running at the same time on different Arduinos by simply opening new tabs/windows.

This must be ran through the Chrome Browser by visiting [here](https://nravanelli.github.io/DAQari/).

## Demo gif:

![alt text](https://github.com/nravanelli/DAQari/blob/main/images/DAQariExample.gif)


## Features:
+ Real-time data recording to local file (up to 1000 Hz)*
+ Transform serial inputs (2-point linear calibration)
+ Integrate serial inputs to create custom channels
+ Auto-detect number of channels from incoming serial data
+ Manipulate chart layout
+ Save configurations and share with others
+ Basic chart configuration settings

***Note:** Current implementation of recording at high sample rate (1000 Hz) will interpolate missing values. That is, missing data will be replaced with the closest known value. There is a risk of missing data at this speed.

Here is an example Arduino sketch you can upload to get running (it can also be found in the [Arduino/example](./Arduino/example) folder). You will need the [Arduino_JSON Library](https://arduinojson.org/). If all your use-case requires is 8 channels at 10-bit accuracy, this is an extremely low-cost option for a DAQ:

```javascript
#include "Arduino_JSON.h"
JSONVar channels;
#define PRINT_SPEED 20 // increase value if you are having issues
static unsigned long lastPrint = 0; // Keep track of print time

int analogPins[] = {A0,A1,A2,A3,A4,A5,A6,A7};

void setup() {
  Serial.begin(115200);
}


void loop() {
if ((lastPrint + PRINT_SPEED) < millis()) // Establish a basic "x times per second" routine.
  {
    //read all analogPins and store in array
    for( int i = 0; i<8; i++){
      channels[i] = analogRead(analogPins[i]);
    }

    // Send the event with JSON variable as parameter to DAQari - DO NOT REMOVE "data". DAQari is listening for that string to be sent, this triggers new data
    JSONVar event;
    event[0] = "data"; //DO NOT CHANGE THIS
    event[1] = channels;

    Serial.println(JSON.stringify(event));

    Serial.flush(); // clear Serial after writing

    lastPrint = millis(); // Update lastPrint time
  }
}
```

Thank you to the following libraries and frameworks that are incorporated into **DAQari**:

- [Bootstrap 5](https://getbootstrap.com/)
- [jQuery](https://jquery.com/)
- [ChartJS](https://www.chartjs.org/)
- [ChartJS Streaming Plugin](https://nagix.github.io/chartjs-plugin-streaming/latest/)
- [IDB-Keyval](https://github.com/jakearchibald/idb-keyval)
- [Javascript Expression Evaluator](https://github.com/silentmatt/expr-eval)
- [SimpleWebSerial](https://fmgrafikdesign.gitbook.io/simplewebserial/)

Change log:
------
__August 31, 2021__
- Able to record to data file at up to 1000 Hz (or every millisecond)

__August 23, 2021__
- Upload configurations
- Download configurations
- Delete locally stored configurations
- Record to local file, currently restricted to 1Hz as fastest write speed
- Basic channel setting options

__August 10, 2021__
- Save configurations and load them
- Added Baud rate selection
- Delete configuration ( not fully implemented )

__July 27, 2021__
- Able to add custom channels integrating values from other predefined channels
- Change line color for each graph
- Clear past config (destroys localdb and refreshes page) -- depreciated

__July 23, 2021__
- Store channel order in localdb
- Incorporated jQuery UI Sortable for handling channel order

__July 22, 2021__
- Uploaded to Github
- Draggable channel order
- Store channel settings in browser Localdb
- Transform inputs (linear regression)
