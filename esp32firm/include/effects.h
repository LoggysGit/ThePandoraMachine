#pragma once

#include <Arduino.h>

#define FASTLED_ESP32_RAW_PIN_ORDER
#include <FastLED.h>

#include "config.h"
#define TOTAL_LEDS STRIP_SEGMENT_LENGTH * STRIP_SEGMENT_NUMBER

class EffectsManager{
public:
    EffectsManager(uint8_t &effectStateBuff);

    void start();
    
    void update();

private:
    uint8_t &effectStateBuffer;
    uint8_t lastState;
    
    CRGB leds[TOTAL_LEDS];
    
    uint32_t lastAnimTick;
    uint16_t animStep;
    uint8_t  pulseCount;

    void setDualPixel(uint8_t segIdx, CRGB color);
    void fillDual(CRGB color);
    void clearAll();
    void resetAnimState();

    void effectIdle();
    void effectProcess();
    void effectSuccess();
    void effectInvalid();
    void effectFailure();
};