#pragma once

#include <Arduino.h>

class EffectsManager{
public:
    EffectsManager(uint8_t &effectStateBuff);

private:
    uint8_t& effectStateBuffer;
};