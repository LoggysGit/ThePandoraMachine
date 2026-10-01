// = THIS MODULE CONNECTS WITH BLE = //
#include "bridge.h"

BLEBridge::BLEBridge(std::vector<uint8_t>& recievedBuff) {
    recievedBuffer = recievedBuff;
}

void BLEBridge::begin(const char* deviceName) {
    BLEDevice::init(deviceName);

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(this);

    BLEService* pService = pServer->createService(SERVICE_UUID);

    pCharacteristic = pService->createCharacteristic(
        CHAR_UUID,
        BLECharacteristic::PROPERTY_READ       |
        BLECharacteristic::PROPERTY_WRITE      |
        BLECharacteristic::PROPERTY_WRITE_NR   |
        BLECharacteristic::PROPERTY_NOTIFY
    );

    pCharacteristic->addDescriptor(new BLE2902());
    pCharacteristic->setCallbacks(this);

    pService->start();

    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    
    BLEDevice::startAdvertising();
    Serial.println("[BLE] Advertising started. Ready for Web Bluetooth connections.");
}

void BLEBridge::setOnDataReceived(DataCallback callback) {
    dataCallback = callback;
}

void BLEBridge::onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("[BLE] Client connected from Web!");
}

void BLEBridge::onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected. Restarting advertising...");
    pServer->startAdvertising();
}

void BLEBridge::onWrite(BLECharacteristic* pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
        const uint8_t* data = reinterpret_cast<const uint8_t*>(value.c_str());
        size_t len = value.length();

        Serial.printf("[BLE] Received %d bytes from Web\n", len);
        recievedBuffer.assign(data, data + len);

        if (dataCallback) {
            dataCallback(data, len);
        }
    }
}

void BLEBridge::sendNotify(const uint8_t* data, size_t length) {
    if (deviceConnected && pCharacteristic) {
        pCharacteristic->setValue(const_cast<uint8_t*>(data), length);
        pCharacteristic->notify();
    }
}