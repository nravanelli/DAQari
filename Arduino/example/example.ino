/* Example Sketch for use with DAQari
 *
 * This sketch will read Anolog Pins (A0 - A7) on Arduino and print to serial in JSON format
 *
 * https://github.com/nravanelli/DAQari
 * Nicholas Ravanelli, PhD
 * MIT License
 */


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
