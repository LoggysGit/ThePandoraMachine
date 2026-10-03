#include <Arduino.h>

#include "mixcontroller.h"
#include "bridge.h"
#include "effects.h"

std::vector<uint8_t> messageBuffer;
uint8_t effectStateBuffer;

BLEBridge bleBridge(messageBuffer);
MixController mixController(messageBuffer, effectStateBuffer);
EffectsManager effectsManager(effectStateBuffer);

void setup() {
    Serial.begin(115200);
    Serial.println("\n> The Pandora Machine enabled. Initializing...");

    // Init BLE bridge (Set your own name!)
    if (!bleBridge.begin("The Pandora Machine #1")) Serial.println("> BLE init failed.");
    // Init mix controller
    if (!mixController.begin()) Serial.println("> Mix controller init failed.");
  
    Serial.println("> The Pandora Machine started.");
}

void loop() {
    // Loop handlers
    mixController.update();
    effectsManager.update();
}