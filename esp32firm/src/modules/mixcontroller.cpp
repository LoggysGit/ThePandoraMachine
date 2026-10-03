// = THIS MODULE CONTROLS PUMPS = //
#include "mixcontroller.h"

MixController::MixController(std::vector<uint8_t> &messageBuff, uint8_t &effectStateBuff)
    : messageBuffer(messageBuff), effectStateBuffer(effectStateBuff)
{}

bool MixController::begin(){
    reg.clearAll();
    reg.update();

    return true;
}

void MixController::update() {
    // Update pumps
    uint32_t now = millis();
    bool stateChanged = false;
    for (auto it = activePumps.begin(); it != activePumps.end(); ) {
        if (now >= it->stopTime) {
            writeShiftRegisters(it->address, LOW);;
            it = activePumps.erase(it);
            stateChanged = true;
        } 
        else
            { ++it; }
    }

    // Check for buffer update
    if (!messageBuffer.empty()){

        // DEBUG
            Serial.print("[MixController] Command received: ");
            for (uint8_t b : messageBuffer)
                { Serial.printf("0x%02X ", b); }
            Serial.println();
        // DEBUG

        // Parse command
        if (!checkCommand()){
            Serial.print("[MixController] Command is corrupted. Terminating.");
            effectStateBuffer = 4;
            messageBuffer.clear();
        }

        // Perform
        if (!isDispensing()) processRecipe();

        // Clear buffer
        messageBuffer.clear();
    }
}

bool MixController::checkCommand() {
    size_t len = messageBuffer.size();

    // Check data length
    if (len < 4) {
        return false;
    }

    // Check EOF (0xEF)
    if (messageBuffer[len - 1] != EOF_BYTE) {
        return false;
    }

    // Check CRC16
    uint16_t receivedCRC = (static_cast<uint16_t>(messageBuffer[len - 3]) << 8) | 
                           static_cast<uint16_t>(messageBuffer[len - 2]);
    size_t payloadLength = len - 3;
    uint16_t calculatedCRC = calculateCRC16(messageBuffer.data(), payloadLength);

    if (calculatedCRC != receivedCRC) {
        return false;
    }

    // All done!
    return true;
}

bool MixController::processRecipe() {
    size_t payloadLength = this->messageBuffer.size() - 3;
    size_t index = 0;

    while (index < payloadLength) {
        if (this->messageBuffer[index] == SEPARATOR_BYTE) {
            index++;
            continue;
        }

        if (index + 3 > payloadLength) return false;

        // Parse
        uint8_t code = this->messageBuffer[index];
        uint16_t value = (static_cast<uint16_t>(this->messageBuffer[index + 1]) << 8) |
                          static_cast<uint16_t>(this->messageBuffer[index + 2]);

        // Convert
        float actualAmount = static_cast<float>(value);

        if (code >= 0x10 && code <= 0x99) {
            actualAmount *= 0.001f;
        }

        // Dispense
        dispenseByCode(code, actualAmount);

        index += 3;
    }

    return true;
}

bool MixController::dispenseByCode(uint8_t code, float amountMl) {
    if (amountMl <= 0.0f) {
        return false;
    }

    // Calculate pump millis
    bool isFlavor = (code >= 0x10 && code <= 0x99);
    float pumpSpeedMlS = isFlavor ? MINI_PUMP_SPEED_MLS : MAIN_PUMP_SPEED_MLS;

    if (pumpSpeedMlS <= 0.0f) {
        Serial.printf("[MixCore] ERROR: Invalid pump speed for code 0x%02X\n", code);
        return false;
    }

    uint32_t pumpMillis = static_cast<uint32_t>((amountMl / pumpSpeedMlS) * 1000.0f);

    // Convert code into adress
    uint8_t address = codeToAddress(code);

    // Trigger pump
    Serial.printf("[MixCore] Pump 0x%02X (%u): %0.3f ml -> set up for %u ms\n", 
                  code, address, amountMl, pumpMillis);
    triggerPump(address, pumpMillis);

    return true;
}

uint8_t MixController::codeToAddress(uint8_t code) {
    // 0xAF - address 0 (Base water)
    if (code == 0xAF) {
        return 0;
    }
    // 0xA0-0xAE - addresses 1-3 (Additional bases)
    if (code >= 0xA0 && code <= 0xA2) {
        return code - 0xA0 + 1;
    }
    // 0x10-0x99 - addresses 4+ (Flavors)
    if (code >= 0x10 && code <= 0x99) {
        return code - 0x10 + 4;
    }
    return 0xFF;
}

bool MixController::triggerPump(uint8_t address, uint32_t durationMs) {
    uint32_t now = millis();

    // Update pump (if in list)
    for (auto &pump : activePumps) {
        if (pump.address == address) {
            pump.stopTime = now + durationMs;
            return true;
        }
    }

    // Add new pump
    activePumps.push_back({address, now + durationMs});

    // Enable shift
    writeShiftRegisters(address, HIGH);

    return true;
}

void MixController::writeShiftRegisters(uint32_t address, uint8_t state) {
    uint8_t pin = 0;

    // Check address
    pin = static_cast<uint8_t>(address);
    if (pin >= 32) {
        Serial.printf("[MixCore] Pin index %u out of range (0-31)!\n", pin);
        return;
    }

    reg.write(pin, state);
    reg.update();

    Serial.printf("[MixCore] Pump Pin %2u -> %s\n", pin, state ? "ON" : "OFF");
}

// OTHER //

uint16_t MixController::calculateCRC16(const uint8_t* data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; ++i) {
        crc ^= data[i];
        for (int j = 0; j < 8; ++j) {
            if (crc & 0x0001) {
                crc = (crc >> 1) ^ 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}
