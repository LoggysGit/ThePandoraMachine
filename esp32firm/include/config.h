#pragma once

// === PINOUT === //

#define SHIFT_DATA_PIN      23  // DS (Data)
#define SHIFT_CLOCK_PIN     14  // SH_CP (Clock)
#define SHIFT_LATCH_PIN     12  // ST_CP (Latch / RCK)

#define PUMP_CLUSTER_1_PIN  25  // 4 Main pumps + first 4 flavors
#define PUMP_CLUSTER_2_PIN  26  // 5-12 flavors
#define PUMP_CLUSTER_3_PIN  27  // 13-20 flavors
#define PUMP_CLUSTER_4_PIN  33  // 21-24 flavors (4 remain)

#define WS_LED_PIN          18  // WS2812B
#define CONNECTION_LED_PIN  4   // Connection LED
#define DEBUG_LED_PIN       2   // Debug LED

#define SENSOR_PIN          19  // Glass sensor

// === CONFIG === //

#define STRIP_SEGMENT_LENGTH 10 // Strip length (in LEDs)
#define STRIP_SEGMENT_NUMBER 2  // How many strips