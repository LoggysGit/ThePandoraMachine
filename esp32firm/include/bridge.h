#pragma once

#include <Arduino.h>
#include <functional>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

class BLEBridge : public BLEServerCallbacks, public BLECharacteristicCallbacks {
public:
    using DataCallback = std::function<void(const uint8_t* data, size_t length)>;

    BLEBridge(std::vector<uint8_t>& recievedBuff);
    
    void begin(const char* deviceName = "Pandora Machine");
    
    void setOnDataReceived(DataCallback callback);
    
    void sendNotify(const uint8_t* data, size_t length);
    
    bool isConnected() const { return deviceConnected; }

    void onConnect(BLEServer* pServer) override;
    void onDisconnect(BLEServer* pServer) override;
    void onWrite(BLECharacteristic* pCharacteristic) override;

private:
    BLEServer* pServer = nullptr;
    BLECharacteristic* pCharacteristic = nullptr;
    bool deviceConnected = false;
    DataCallback dataCallback = nullptr;

    std::vector<uint8_t>& recievedBuffer;

    static constexpr const char* SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
    static constexpr const char* CHAR_UUID    = "0000ffe1-0000-1000-8000-00805f9b34fb";
};