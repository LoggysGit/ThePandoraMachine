#pragma once

// === PINOUT === //

#define SHIFT_DATA_PIN      23  // DS (Data)
#define SHIFT_CLOCK_PIN     14  // SH_CP (Clock)
#define SHIFT_LATCH_PIN     17  // ST_CP (Latch / RCK)

#define WS_LED_PIN          18  // WS2812B
#define CONNECTION_LED_PIN  4   // Connection LED
#define DEBUG_LED_PIN       2   // Debug LED

#define SENSOR_PIN          19  // Glass sensor

// === CONFIG === //

#define EOF_BYTE            0xEF
#define SEPARATOR_BYTE      0x0A

#define STRIP_SEGMENT_LENGTH 4 // Strip length (in LEDs)
#define STRIP_SEGMENT_NUMBER 2  // How many strips

#define LED_TYPE            WS2812B
#define COLOR_ORDER         GRB

#define MINI_PUMP_SPEED_MLS 0.0167 // Main pump speed (ml/s) [SET YOUR OWN!]
#define MAIN_PUMP_SPEED_MLS 0.5    // Mini pump speed (ml/s) [SET YOUR OWN!]

#define MAX_ACTIVE_PUMPS    32 