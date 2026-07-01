# Calibration

IceWatch treats sensor readings as environmental evidence, not perfect truth.

## Moisture Ranges

Observed outdoor ranges:

| Moisture value | Interpretation |
| --- | --- |
| `> 3000` | Dry or mostly dry |
| `1700 - 3000` | Damp |
| `1300 - 1700` | Wet |
| `< 1300` | Very wet or pooling |

## Notes

- Lower moisture readings mean wetter conditions.
- Wet readings near or below freezing increase hazard severity.
- Sensor placement, contact, drainage, shade, wind, and surface material all affect readings.
- Production deployment needs per-location calibration instead of one universal threshold.
