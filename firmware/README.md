# Firmware Interface

The public repo documents the sensor data contract, not the full firmware implementation.

IceWatch nodes post temperature and moisture readings to the local intake service. New devices are reviewed in the admin panel before being assigned to a map location.

```json
{
  "device_id": "ESP-VH-001",
  "temperature": -1.4,
  "moisture": 2700,
  "ice_level": 2
}
```

Deeper firmware, calibration, and power-management details are intentionally kept out of the public repository while the hardware path continues to mature.
