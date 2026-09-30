#pragma once

class BLEBridge{
public:
    BLEBridge();

private:
    const String SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
    const String CHAR_WRITE_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
    const String CHAR_NOTIFY_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
};