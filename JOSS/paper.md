---
title: 'DAQari: Browser-based real-time data acquisition solution using WebSerial API'
tags:
  - Arduino
  - data acquisition
  - serial
  - JavaScript
  - web browser
authors:
  - name: Nicholas Ravanelli^[corresponding author] # note this makes a footnote saying 'co-first author'
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

The Arduino platform is gaining increasing popularity for its potential use in education and research as a low cost alternative to expensive commercially available options. Although many of the Arduino SBC variants offers digital inputs and an on-board 10-bit resolution analog-to-digital converter, there is a growing catalog of sensors and shields that can expand its functionality. While there exists current data acquisition software packages and pre-existing program add-ons for the Arduino platform [@Grinias:2016; @Nichols:2017], they require installation of additional software, plugins, or dependencies for their use. As such, there remained a gap in available software options using the Arduino SBC to visualize and record  real-time raw analog or digital signals that is virtually platform agnostic and required no additional local dependencies. With the rise in web applications, a browser-based software package is the likely candidate to eliminate the need for installing additional requirements. Further, a browser-based software solution enables cross-platform compatibility (i.e. Windows, Mac, Linux) with minimal code translation.

# Program Description

`DAQari` is a simple browser-based data acquisition solution for teaching and research purposes. 

# References
