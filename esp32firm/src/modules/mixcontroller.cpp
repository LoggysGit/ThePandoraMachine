// = THIS MODULE CONTROLS PUMPS = //
#include "mixcontroller.h"

MixController::MixController(std::vector<uint8_t>* messageBuff){
    messageBuffer = messageBuff;
}