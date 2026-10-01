#include <Arduino.h>

#include "mixcontroller.h"
#include "bridge.h"

std::vector<uint8_t>* messageBuffer;

BLEBridge bleBridge(messageBuffer);
MixController mixController(messageBuffer);

void setup() {
  
}

void loop() {
  
}