// = THIS MODULE CONTROLS PUMPS = //
#include "mixcontroller.h"

MixController::MixController(std::vector<uint8_t> &messageBuff, uint8_t &effectStateBuff)
    : messageBuffer(messageBuff), effectStateBuffer(effectStateBuff)
{}

bool MixController::begin(){
    return true;
}

void MixController::update() {
    // ?
    if (!messageBuffer.empty()){

        // DEBUG
            Serial.print("[MixController] Command received (bytes: ");
            Serial.print(messageBuffer.size());
            Serial.print("): ");
            for (uint8_t b : messageBuffer) {
                Serial.printf("0x%02X ", b);
            }
            Serial.println();
        // DEBUG

        // Parse command
        if (!checkCommand()){
            Serial.print("[MixController] Command is corrupted. Terminating.");
            effectStateBuffer = 4;
            messageBuffer.clear();
        }

        // Perform
        processRecipe();

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

        Serial.printf("Code: 0x%02X | Raw Val: %u | Calculated: %.3f\n", code, value, actualAmount);

        // Dispense
        dispenseByCode(code, actualAmount);

        index += 3;
    }

    return true;
}

bool MixController::dispenseByCode(uint8_t code, float amountMl){

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