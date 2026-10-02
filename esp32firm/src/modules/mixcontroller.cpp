// = THIS MODULE CONTROLS PUMPS = //
#include "mixcontroller.h"

MixController::MixController(std::vector<uint8_t> &messageBuff, uint8_t &effectStateBuff)
    : messageBuffer(messageBuff), effectStateBuffer(effectStateBuff)
{}

bool MixController::begin(){
    return true;
}

void MixController::update() {
    if (messageBuffer.empty()) return;

    // DEBUG
    Serial.print("[MixController] Command received (bytes: ");
    Serial.print(messageBuffer.size());
    Serial.print("): ");
    for (uint8_t b : messageBuffer) {
        Serial.printf("0x%02X ", b);
    }
    Serial.println();

    // Parse command

    // Clear buffer
    messageBuffer.clear();
}