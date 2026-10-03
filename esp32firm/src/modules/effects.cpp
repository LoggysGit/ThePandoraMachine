#include "effects.h"

EffectsManager::EffectsManager(uint8_t &effectStateBuff)
    : effectStateBuffer(effectStateBuff),
      lastState(255),
      lastAnimTick(0),
      animStep(0),
      pulseCount(0)
{}

void EffectsManager::start() {
    FastLED.addLeds<WS2812B, WS_LED_PIN, GRB>(leds, TOTAL_LEDS).setCorrection(TypicalLEDStrip);
    FastLED.setBrightness(25);
    clearAll();
    FastLED.show();
}

void EffectsManager::update() {
    if (effectStateBuffer != lastState) {
        resetAnimState();
        Serial.printf("[Effects] New effect: %u.", effectStateBuffer);
        lastState = effectStateBuffer;
    }

    switch (effectStateBuffer) {
        case 1:
            effectProcess();
            break;

        case 2:
            effectSuccess();
            break;

        case 4:
            effectInvalid();
            break;

        case 5:
            effectFailure();
            break;

        default:
            effectIdle();
            break;
    }

    FastLED.show();
}

/* ================= ADDITIONAL ================= */

void EffectsManager::setDualPixel(uint8_t segIdx, CRGB color) {
    if (segIdx >= STRIP_SEGMENT_LENGTH) return;
    
    for (uint8_t s = 0; s < STRIP_SEGMENT_NUMBER; s++) {
        leds[segIdx + (s * STRIP_SEGMENT_LENGTH)] = color;
    }
}

void EffectsManager::fillDual(CRGB color) {
    for (uint8_t i = 0; i < STRIP_SEGMENT_LENGTH; i++) {
        setDualPixel(i, color);
    }
}

void EffectsManager::clearAll() {
    fill_solid(leds, TOTAL_LEDS, CRGB::Black);
}

void EffectsManager::resetAnimState() {
    animStep = 0;
    pulseCount = 0;
    lastAnimTick = millis();
    clearAll();
}

/* ================= EFFECTS ================= */

void EffectsManager::effectIdle() {
    uint8_t val = beatsin8(12, 20, 255); 
    CRGB color = CRGB(0, val / 4, val);
    
    fillDual(color);
}

void EffectsManager::effectProcess() {
    if (millis() - lastAnimTick >= 45) {
        lastAnimTick = millis();

        for (uint8_t i = 0; i < STRIP_SEGMENT_LENGTH; i++) {
            CRGB c = leds[i];
            c.nscale8(170);
            setDualPixel(i, c);
        }

        setDualPixel(animStep, CRGB(0, 255, 150));

        animStep = (animStep + 1) % STRIP_SEGMENT_LENGTH;
    }
}

void EffectsManager::effectSuccess() {
    if (millis() - lastAnimTick >= 10) {
        lastAnimTick = millis();

        uint8_t val = sin8(animStep);
        fillDual(CRGB(0, val, 40));

        animStep += 4;
        if (animStep >= 256) {
            effectStateBuffer = 0;
        }
    }
}

void EffectsManager::effectInvalid() {
    if (millis() - lastAnimTick >= 50) {
        lastAnimTick = millis();

        clearAll();

        if (animStep < STRIP_SEGMENT_LENGTH) {
            setDualPixel(animStep, CRGB(255, 100, 0));
            animStep++;
        } else {
            effectStateBuffer = 0;
        }
    }
}

void EffectsManager::effectFailure() {
    if (millis() - lastAnimTick >= 12) {
        lastAnimTick = millis();

        uint8_t val = sin8(animStep & 0xFF);
        fillDual(CRGB(val, 0, 0));

        animStep += 6;
        
        if (animStep >= (pulseCount + 1) * 256) {
            pulseCount++;
            if (pulseCount >= 3) {
                effectStateBuffer = 0;
            }
        }
    }
}