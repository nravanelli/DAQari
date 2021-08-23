---
title: 'DAQari: Browser-based real-time data acquisition solution using WebSerial API'
tags:
  - Arduino
  - data acquisition
  - serial
  - JavaScript
  - web browser
authors:
  - name: Nicholas Ravanelli [corresponding author]
    orcid: 0000-0002-4894-9552
    affiliation: 1
affiliations:
 - name: School of Kinesiology, Faculty of Health and Behavioural Sciences, Lakehead University
   index: 1

date: 23 August 2021
bibliography: paper.bib

---

# Summary

Data acquisition hardware and software can be a costly investment for teaching or research laboratories, irrespective of discipline. Advancements in standard Single Board Computers (SBC) such as the Arduino platform have reduced the cost of basic analog or digital signal acquisition. However, current data acquisition software solutions for the Arduino platform require installation of dependencies (i.e. Python), and may be purpose-built, limiting widespread adoption for various disciplines. `DAQari` is the first all-in-one browser-based data acquisition software leveraging the latest Web Serial API [@WebSerial] and File System Access API [@FileSystemAccess] enabling real-time data visualization and recording from an Arduino or compatible SBC.


# Statement of need

The Arduino platform and other SBC are gaining increasing popularity for their potential use in education and research as low cost alternatives to expensive commercial options. Many of the Arduino SBC variants offer digital inputs and an on-board 10-bit resolution analog-to-digital converter, and a growing catalog of sensors and shields can expand it's core functionality making their use-case almost limitless. While there exists current data acquisition software packages and pre-existing program add-ons for the Arduino platform [@Grinias:2016; @Nichols:2017], they require installation of additional software, plugins, or dependencies for their use. As such, there remains a gap in available software options to visualize and record real-time raw analog or digital signals that is nearly platform independent and required no additional local dependencies. With the global rise in web applications, a browser-based software package is the likely candidate to eliminate the need for installing additional requirements. Further, a browser-based software solution enables cross-platform compatibility (i.e. Windows, Mac, Linux) with minimal code translation.

# Program description

`DAQari` is a browser-based data acquisition solution for teaching and research purposes that reads incoming data from the user-selected serial port. All dependencies are loaded within the browser session and can be assessed via the repository GitHub Pages through Hypertext Transfer Protocol Secure (i.e. https://), or by downloading the git package locally. The software was developed to not be exclusive for the Arduino SBC family but rather require serial data to be formatted in a specific JSON architecture. This design also ensured that there were no absolute restrictions on the number of unique signals (or channels) that the software could handle, however the SBC's serial buffer size will be the ultimate restriction (e.g. Arduino serial buffer size is 64 bytes). Upon initial connection to the serial device, `DAQari` validates the incoming raw data and displays it in text-format. Following confirmation of valid incoming data, `DAQari` dynamically generates a real-time graph of incoming data for each channel. At this point, the user is able to modify the arrangement of loaded channels, and translate any raw input to it's suggested value. For example, a thermistors raw analog output in millivolts can be converted to a temperature value within the graphical user interface. Additionally, new user defined channels can be created from integrating other channel data using basic algebra. All user settings of serial and user-defined channels can be saved locally within the browser for future use, and can be downloaded as a text file to be shared with colleagues or peers. The decision to leverage conversions within `DAQari` and not prior to serial communication on the SBC was to offer greater customization by the user, and provide an educational component for instructors on how analog signals are converted.

Recording of serial data is currently limited to a maximum of 1 sample a second for all channels. This is done in real-time and records to a user-defined text file in comma-separated format. This may be perceived as a limitation to the software package thus limiting current use cases for educational or research purposes. However, if measurement frequency is < 1Hz, then `DAQari` may serve as viable option for educational or research purposes for signal acquisition.

# References
