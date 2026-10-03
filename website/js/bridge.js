import jsYaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';

const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const CHAR_WRITE_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
const CHAR_NOTIFY_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

const GROUP_SEPARATOR = 0x0a;

const BYTE_CODES = {
  WAT: 0xaf,
  SUG: 0xa0,
  SOR: 0xa1,
  STI: 0xa2,
  EOF: 0xef,
};

export async function loadByteCodes(yamlPath) {
  try {
      const response = await fetch(yamlPath);
      if (!response.ok) {
          throw new Error(`[BLE] Failed to fetch ${yamlPath}: ${response.statusText}`);
      }

      const yamlText = await response.text();
      const config = jsYaml.load(yamlText) || {};

      const flavours = config.inventory?.flavours || {};
      const flavourKeys = Object.keys(flavours);

      let nextCode = 0x10;
      for (const key of flavourKeys) {
          if (nextCode >= 0xa0) {
              throw new Error(`[BLE] Flavour code ${nextCode.toString(16)} is out of range.`);
          }
          BYTE_CODES[key] = nextCode;
          nextCode += 1;
      }

      console.log("[BLE] Bytecodes loaded.");
      return BYTE_CODES;
  } catch (e) {
      console.error(`[BLE] Error loading byte codes from YAML:`, e);
      return BYTE_CODES;
  }
}

function crc16Modbus(bytes) {
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x0001) {
        crc = (crc >>> 1) ^ 0xa001;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return crc & 0xffff;
}

export function convertRecipe(recipeStr) {
  const recipe = recipeStr.replace(/\\n/g, "\n");
  const lines = recipe
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const dataLines = lines.filter((l) => l !== "EOF");
  const payload = [];

  dataLines.forEach((line, i) => {
    const items = line.split(",");
    for (const item of items) {
      const codeStr = item.slice(0, 3);
      const valueStr = item.slice(3);
      const value = parseInt(valueStr, 10);

      if (!(codeStr in BYTE_CODES)) {
        throw new Error(`[BLE] Unknown code: ${codeStr} in ${item}`);
      }
      if (!(value >= 0 && value <= 0xffff)) {
        throw new Error(`[BLE] Value out of 2-byte range for ${item}: ${value}`);
      }

      payload.push(BYTE_CODES[codeStr]);
      payload.push((value >> 8) & 0xff);
      payload.push(value & 0xff);
    }

    if (i < dataLines.length - 1) {
      payload.push(GROUP_SEPARATOR);
    }
  });

  const checksum = crc16Modbus(payload);
  payload.push((checksum >> 8) & 0xff);
  payload.push(checksum & 0xff);
  payload.push(BYTE_CODES.EOF);

  return new Uint8Array(payload);
}

export class ESPBridge {
  constructor({ onNotify, onChangeConnection, onError, systemPromptPath } = {}) {
    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.isConnected = false;

    this.onNotify = onNotify || (() => {});
    this.onChangeConnection = onChangeConnection || (() => {});
    this.onError = onError || ((e) => console.error("[BLE]", e));

    loadByteCodes(systemPromptPath);
    this.onChangeConnection(this.isConnected);
  }

  isSupported() {
    return "bluetooth" in navigator;
  }

  async requestAndConnect() {
    if (!this.isSupported()) {
      this.onError("[BLE] Web Bluetooth is not supported in this browser.");
      return false;
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });

      this.device.addEventListener("gattserverdisconnected", () => {
        this.isConnected = false;
      });

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(CHAR_WRITE_UUID);

      const notifyChar =
        CHAR_NOTIFY_UUID === CHAR_WRITE_UUID
          ? this.characteristic
          : await service.getCharacteristic(CHAR_NOTIFY_UUID);

      await notifyChar.startNotifications();
      notifyChar.addEventListener("characteristicvaluechanged", (event) => {
        const value = new Uint8Array(event.target.value.buffer);
        this.onNotify(value);
      });

      this.isConnected = true;
      this.onChangeConnection(this.isConnected);
      return true;
    }
    catch (e) {
      this.onError(e);
      this.isConnected = false;
      this.onChangeConnection(this.isConnected);
      return false;
    }
  }

  async send(bytes) {
    if (!this.isConnected || !this.characteristic) {
      this.onError(`Cannot send "${bytes}" - not connected`);
      return false;
    }
    try {
      await this.characteristic.writeValue(bytes);
      return true;
    } catch (e) {
      this.onError(e);
      return false;
    }
  }

  async dispenseRecipe(recipeStr) {
    const bytes = convertRecipe(recipeStr);
    return this.send(bytes);
  }

  async testPump(pumpCode, pumpIndex = null) {
    const payload = [];
    const mainPumps = ["WAT", "SUG", "SOR", "STI"];

    // Main pumps
    mainPumps.forEach((code, i) => {
        const val = code === pumpCode ? 100 : 0;

        payload.push(BYTE_CODES[code]);
        payload.push((val >> 8) & 0xff);
        payload.push(val & 0xff);

        if (i < mainPumps.length - 1) {
            payload.push(GROUP_SEPARATOR);
        }
    });

    // Flavor
    if (pumpCode === "FLV" && pumpIndex !== null) {
        const flavourByte = 0x10 + (pumpIndex - 1);

        payload.push(GROUP_SEPARATOR);
        payload.push(flavourByte);
        payload.push((100 >> 8) & 0xff);
        payload.push(100 & 0xff);
    }

    // CRC + EOF
    const checksum = crc16Modbus(payload);
    payload.push((checksum >> 8) & 0xff);
    payload.push(checksum & 0xff);
    payload.push(BYTE_CODES.EOF);

    return this.send(new Uint8Array(payload));
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.onChangeConnection(this.isConnected);
  }
}
