#pragma once

#include <Arduino.h>
#include <vector>
#include <cstdint>
#include <functional>

#define GSHIFT_DELAY 5
#include <GyverShift.h>

#include "config.h"

class MixController {
public:
    MixController(std::vector<uint8_t>& messageBuff, uint8_t& effectStateBuff);

    bool begin();

    void update();

    void stopAll();

    bool isDispensing() const { return !activePumps.empty(); }

private:
    GyverShift<OUTPUT, 4> reg{SHIFT_LATCH_PIN, SHIFT_DATA_PIN, SHIFT_CLOCK_PIN};

    std::vector<uint8_t>& messageBuffer;
    uint8_t& effectStateBuffer;

    uint32_t registerState = 0;

    bool checkCommand();

    bool processRecipe();

    bool dispenseByCode(uint8_t code, float amountMl);

    bool triggerPump(uint8_t address, uint32_t durationMs);

    void writeShiftRegisters(uint32_t address, uint8_t state);

    uint8_t codeToAddress(uint8_t code);

    uint32_t millilitersToMillis(uint8_t code, uint16_t amountMl);

    uint16_t calculateCRC16(const uint8_t* data, size_t length);

    struct ActivePump {
        uint8_t address;
        uint32_t stopTime;
    };
    std::vector<ActivePump> activePumps;
};