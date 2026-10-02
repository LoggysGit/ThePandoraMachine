// //
#include "effects.h"

EffectsManager::EffectsManager(uint8_t &effectStateBuff)
    :effectStateBuffer(effectStateBuff)
{}

void EffectsManager::start(){
    // Init LED
}

void EffectsManager::update(){
    switch (effectStateBuffer)
    {
    case 1:
        /* Process */
        break;

    case 2:
        /* Success */
        break;

    case 4:
        /*Invalid code*/
        break;
    
    case 5:
        /*Internal error*/
        break;

    default:
        /*Idle*/
        break;
    }
}

/* EFFECTS */

void EffectsManager::effectIdle(){

}

void EffectsManager::effectProcess(){

}

void EffectsManager::effectInvalid(){

}

void EffectsManager::effectFailure(){

}