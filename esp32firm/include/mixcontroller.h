#pragma once

#include <Arduino.h>
#include <vector>
#include <cstdint>
#include <functional>

#include <GyverHC595.h>

#include "config.h"

class MixController {
public:
    explicit MixController(const std::vector<uint8_t>& messageBuff);

    void begin();

    bool dispenseByCode(uint8_t code, uint16_t amountMl);

    bool processRecipe();

    void update();

    void stopAll();

    bool isDispensing() const { return !activePumps.empty(); }

private:
    GyverHC595<4> reg(SHIFT_DATA_PIN, SHIFT_CLOCK_PIN, SHIFT_LATCH_PIN);

    const std::vector<uint8_t>& messageBuffer;

    uint32_t registerState = 0;

    uint32_t millilitersToMillis(uint8_t code, uint16_t amountMl);

    bool triggerPump(uint8_t address, uint32_t durationMs);

    void writeShiftRegisters(uint32_t bitmask);

    struct ActivePump {
        uint8_t address;
        uint32_t stopTime;
    };

    std::vector<ActivePump> activePumps;
};