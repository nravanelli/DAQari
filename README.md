# ![DAQari](https://github.com/nravanelli/DAQari/blob/main/images/logo.svg) DAQari

A simple browser-based DAQ software using WebSerial &amp; FileSystem Access API's

**DAQari** was born from my need for a simple data acquisition software that could read 16 Analog signals at ~5Hz passed through an ADC Arduino shield. It is not as sophisticated as products such as LabChart, LabView, or Matlab. However, if all you need is analog (or digital) inputs that can be ingested by an Arduino board and at low Hz (5-100Hz, depending on # of channels and amount of data being pushed to serial port), this is sufficient. Considering that commercial options cost $1000's, a simple DAQ can be built for < $30 with 8 10-bit analog inputs. Moreover, you can have multiple instances of **DAQari** running at the same time on different Arduinos by simply opening new tabs/windows.

This can be ran locally (download git), or on ANY internet connected device [here](https://nravanelli.github.io/DAQari/).

Here is an example Arduino sketch you can upload to get running (it can also be found in the [Arduino/example](../Arduino/example) folder):
```javascript
#include <SimpleWebSerial.h>
SimpleWebSerial WebSerial;
JSONVar channels;
#define PRINT_SPEED 30 // increase value if you are having issues
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
    WebSerial.send("data", channels);

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


## Demo:

![alt text](https://github.com/nravanelli/DAQari/blob/main/images/DAQariV1.gif)

Changelog
------
__August 10, 2021__
- Save configurations and load them
- Added Baud rate selection
- Delete configuration ( not fully implemented )

__July 27, 2021__
- Able to add custom channels integrating values from other predefined channels
- Change line color for each graph
- Clear past config (destroys localdb and refreshes page)

__July 23, 2021__
- Store channel order in localdb
- Incorporated jQuery UI Sortable for handling channel order

__July 22, 2021__
- Draggable channel order
- Store channel settings in browser Localdb
- Transform inputs (linear regression)
