import { describe, expect, it } from "vitest";
import { formatDeviceTitle, isGenericDeviceName } from "./deviceLabelUtils";

describe("device label utilities", () => {
  it("uses the ESP32 identifier when the device name is generic", () => {
    expect(isGenericDeviceName("ESP32 Sensor", "ESP-01")).toBe(true);
    expect(formatDeviceTitle("ESP32 Sensor", "ESP-01")).toBe("ESP-01");
  });

  it("keeps a useful human-readable device name", () => {
    expect(isGenericDeviceName("Vari Hall Node", "ESP-01")).toBe(false);
    expect(formatDeviceTitle("Vari Hall Node", "ESP-01")).toBe("Vari Hall Node");
  });
});
