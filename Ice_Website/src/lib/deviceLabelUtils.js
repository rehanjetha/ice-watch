function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function isGenericDeviceName(deviceName, deviceId) {
  const normalizedName = normalize(deviceName);
  const normalizedId = normalize(deviceId);

  return (
    !normalizedName ||
    normalizedName === "esp32" ||
    normalizedName === "esp32 sensor" ||
    normalizedName === normalizedId
  );
}

export function formatDeviceTitle(deviceName, deviceId) {
  const normalizedId = normalize(deviceId);
  if (!normalizedId) {
    return deviceName || "ESP32 Sensor";
  }

  if (isGenericDeviceName(deviceName, deviceId)) {
    return deviceId;
  }

  return deviceName;
}
