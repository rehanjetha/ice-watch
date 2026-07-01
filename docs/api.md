# Local API

The local API runs inside the Vite development server and supports the demo sensor workflow.

Base URL:

```text
http://localhost:5173
```

## Main Surfaces

| Surface | Purpose |
| --- | --- |
| Health/scanner | Check server status and toggle intake |
| Readings | Return recent sensor readings |
| Devices | Manage approved sensor devices |
| Pending devices | Review newly detected ESP32 boards |
| ESP32 intake | Accept temperature/moisture readings from hardware |

The local service is intentionally in-memory. Production storage, auth, and device monitoring are future work.
