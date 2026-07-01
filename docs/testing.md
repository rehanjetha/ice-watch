# Testing

Run from `Ice_Website/`:

```bash
npm run check
```

This runs:

- ESLint
- TypeScript checking
- Vitest unit/middleware tests
- production build
- dependency audit

## Current Automated Coverage

| File | Coverage |
| --- | --- |
| `src/lib/hazardUtils.test.js` | Hazard classification and demo reference behavior |
| `src/lib/moistureUtils.test.js` | Moisture labels and averages |
| `src/lib/deviceLabelUtils.test.js` | ESP32 naming/display helpers |
| `src/data/campusLocations.test.js` | Location search and radii |
| `devServer/sensorService.test.js` | Intake gating, pending-device approval, reading promotion |

Manual browser QA covers the dashboard, map, navigator, alerts, and sensor admin workflow.
