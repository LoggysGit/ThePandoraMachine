#pragma once

#include <Arduino.h>

class EffectsManager{
public:
    EffectsManager(uint8_t &effectStateBuff);

    void start();
    
    void update();

private:
    uint8_t& effectStateBuffer;

    void effectIdle();

    void effectProcess();
    void effectInvalid();
    void effectFailure();
};