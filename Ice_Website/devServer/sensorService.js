import { randomUUID } from "node:crypto";

const ICE_LEVEL_MAP = { 0: "safe", 1: "caution", 2: "warning", 3: "danger" };
const DEFAULT_LATITUDE = 43.7735;
const DEFAULT_LONGITUDE = -79.5019;
const DEFAULT_LOCATION_LABEL = "Unassigned";
const MAX_READINGS = 500;
const MAX_PENDING_BUFFER = 50;

function utcNow() {
  return new Date().toISOString();
}

function toFloat(value, fallback = null) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDeviceName(deviceName, deviceId) {
  const normalizedName = String(deviceName || "").trim().toLowerCase();
  const normalizedId = String(deviceId || "").trim().toLowerCase();

  if (
    !normalizedName ||
    normalizedName === "esp32" ||
    normalizedName === "esp32 sensor" ||
    normalizedName === normalizedId
  ) {
    return deviceId || "ESP32 Sensor";
  }

  return String(deviceName).trim();
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

export function createSensorService() {
  const state = {
    devices: [],
    readings: [],
    pendingDevices: new Map(),
    intakeActive: false,
    port: 5173,
  };

  function setPort(port) {
    if (port) {
      state.port = Number(port);
    }
  }

  function serializeScannerStatus() {
    return {
      server_online: true,
      intake_active: state.intakeActive,
      pending_count: state.pendingDevices.size,
      registered_count: state.devices.length,
      port: state.port,
    };
  }

  function findDeviceByUuid(deviceId) {
    return state.devices.find((device) => device.id === deviceId) || null;
  }

  function findDeviceBySensorId(deviceId) {
    return state.devices.find((device) => device.device_id === deviceId) || null;
  }

  function createDeviceRecord(data, forcedDeviceId = null) {
    let radius = toFloat(data.radius, null);
    if (radius !== null && radius <= 0) {
      radius = null;
    }

    const resolvedDeviceId =
      data.device_id || forcedDeviceId || `ESP-${randomUUID().slice(0, 6).toUpperCase()}`;

    return {
      id: randomUUID(),
      device_name: normalizeDeviceName(data.device_name, resolvedDeviceId),
      device_id: resolvedDeviceId,
      latitude: toFloat(data.latitude, DEFAULT_LATITUDE),
      longitude: toFloat(data.longitude, DEFAULT_LONGITUDE),
      location_label: data.location_label || DEFAULT_LOCATION_LABEL,
      status: data.status || "online",
      battery_level: toInt(data.battery_level, 100),
      radius,
      created_date: utcNow(),
    };
  }

  function createReading(device, payload, createdDate = utcNow()) {
    const iceLevel = toInt(payload.ice_level, 0);
    return {
      id: randomUUID(),
      device_id: device.device_id,
      temperature: toFloat(payload.temperature, null),
      moisture: toInt(payload.moisture, null),
      hazard_level: ICE_LEVEL_MAP[iceLevel] || "safe",
      latitude: device.latitude,
      longitude: device.longitude,
      location_label: device.location_label,
      radius: device.radius,
      created_date: createdDate,
    };
  }

  function insertReading(reading) {
    state.readings.unshift(reading);
    if (state.readings.length > MAX_READINGS) {
      state.readings.length = MAX_READINGS;
    }
  }

  function trackPendingDevice(deviceId, payload) {
    const timestamp = utcNow();
    const preview = {
      temperature: toFloat(payload.temperature, null),
      moisture: toInt(payload.moisture, null),
      ice_level: toInt(payload.ice_level, 0),
      hazard_level: ICE_LEVEL_MAP[toInt(payload.ice_level, 0)] || "safe",
      created_date: timestamp,
    };

    const pending = state.pendingDevices.get(deviceId) || {
      id: deviceId,
      device_id: deviceId,
      device_name: normalizeDeviceName(payload.device_name, deviceId),
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      reading_count: 0,
      latest_preview: preview,
      buffered_readings: [],
    };

    pending.device_name = normalizeDeviceName(payload.device_name || pending.device_name, deviceId);
    pending.last_seen_at = timestamp;
    pending.reading_count += 1;
    pending.latest_preview = preview;
    pending.buffered_readings.unshift({
      temperature: preview.temperature,
      moisture: preview.moisture,
      ice_level: preview.ice_level,
      created_date: timestamp,
    });
    pending.buffered_readings = pending.buffered_readings.slice(0, MAX_PENDING_BUFFER);

    state.pendingDevices.set(deviceId, pending);
    return pending;
  }

  function promotePendingReadings(device, pending) {
    let promoted = 0;
    [...(pending.buffered_readings || [])].reverse().forEach((buffered) => {
      insertReading(createReading(device, buffered, buffered.created_date));
      promoted += 1;
    });
    return promoted;
  }

  function serializePendingDevices() {
    return [...state.pendingDevices.values()]
      .sort((left, right) => right.last_seen_at.localeCompare(left.last_seen_at))
      .map((pending) => ({
        id: pending.id,
        device_id: pending.device_id,
        device_name: pending.device_name,
        first_seen_at: pending.first_seen_at,
        last_seen_at: pending.last_seen_at,
        reading_count: pending.reading_count,
        latest_preview: pending.latest_preview,
      }));
  }

  async function handleRequest(req, res, next) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return json(res, 200, { ok: true });
    }

    const isApiPath = path.startsWith("/api/");
    const isEsp32Path = path === "/esp32/data";
    const isLegacyRootEsp32Path = path === "/" && req.method === "POST";
    if (!isApiPath && !isEsp32Path && !isLegacyRootEsp32Path) {
      return next();
    }

    try {
      if (req.method === "GET" && path === "/api/health") {
        return json(res, 200, { status: "ok", ...serializeScannerStatus() });
      }

      if (req.method === "GET" && path === "/api/scanner/status") {
        return json(res, 200, serializeScannerStatus());
      }

      if (req.method === "POST" && path === "/api/scanner/start") {
        state.intakeActive = true;
        return json(res, 200, serializeScannerStatus());
      }

      if (req.method === "POST" && path === "/api/scanner/stop") {
        state.intakeActive = false;
        return json(res, 200, serializeScannerStatus());
      }

      if (req.method === "GET" && path === "/api/readings") {
        const limit = Number.parseInt(url.searchParams.get("limit") || "100", 10);
        return json(res, 200, state.readings.slice(0, Number.isFinite(limit) ? limit : 100));
      }

      if (req.method === "GET" && path === "/api/devices") {
        return json(res, 200, state.devices);
      }

      if (req.method === "GET" && path === "/api/pending-devices") {
        return json(res, 200, serializePendingDevices());
      }

      if (req.method === "POST" && (path === "/api/esp32/data" || path === "/esp32/data" || path === "/")) {
        const data = await readJsonBody(req);

        if (data.temperature === undefined || data.moisture === undefined) {
          return json(res, 400, { error: "temperature and moisture required" });
        }

        if (!state.intakeActive) {
          return json(res, 503, { error: "sensor intake is not active", ...serializeScannerStatus() });
        }

        const deviceId = data.device_id || "ESP-UNKNOWN";
        const matchedDevice = findDeviceBySensorId(deviceId);

        if (!matchedDevice) {
          const pending = trackPendingDevice(deviceId, data);
          return json(res, 202, {
            pending: true,
            message: "New ESP32 detected and awaiting approval",
            device_id: deviceId,
            preview: pending.latest_preview,
          });
        }

        const reading = createReading(matchedDevice, data);
        insertReading(reading);
        return json(res, 201, reading);
      }

      if (req.method === "POST" && path === "/api/devices") {
        const data = await readJsonBody(req);
        if (data.device_id && findDeviceBySensorId(data.device_id)) {
          return json(res, 409, { error: "device_id already registered" });
        }

        const device = createDeviceRecord(data);
        state.devices.push(device);

        const pending = state.pendingDevices.get(device.device_id);
        let promotedReadings = 0;
        if (pending) {
          promotedReadings = promotePendingReadings(device, pending);
          state.pendingDevices.delete(device.device_id);
        }

        return json(res, 201, { device, promoted_readings: promotedReadings });
      }

      const deviceMatch = path.match(/^\/api\/devices\/([^/]+)$/);
      if (deviceMatch && req.method === "PATCH") {
        const device = findDeviceByUuid(decodeURIComponent(deviceMatch[1]));
        if (!device) {
          return json(res, 404, { error: "not found" });
        }

        const data = await readJsonBody(req);
        if ("device_name" in data) device.device_name = data.device_name || device.device_name;
        if ("location_label" in data) device.location_label = data.location_label || device.location_label;
        if ("latitude" in data) device.latitude = toFloat(data.latitude, device.latitude);
        if ("longitude" in data) device.longitude = toFloat(data.longitude, device.longitude);
        if ("status" in data) device.status = data.status || device.status;
        if ("battery_level" in data) device.battery_level = toInt(data.battery_level, device.battery_level);
        if ("radius" in data) {
          const radius = toFloat(data.radius, null);
          device.radius = radius !== null && radius > 0 ? radius : null;
        }

        return json(res, 200, device);
      }

      if (deviceMatch && req.method === "DELETE") {
        const index = state.devices.findIndex((device) => device.id === decodeURIComponent(deviceMatch[1]));
        if (index === -1) {
          return json(res, 404, { error: "not found" });
        }

        state.devices.splice(index, 1);
        return json(res, 200, { ok: true });
      }

      const pendingApproveMatch = path.match(/^\/api\/pending-devices\/([^/]+)\/approve$/);
      if (pendingApproveMatch && req.method === "POST") {
        const deviceId = decodeURIComponent(pendingApproveMatch[1]);
        const pending = state.pendingDevices.get(deviceId);
        if (!pending) {
          return json(res, 404, { error: "pending device not found" });
        }
        if (findDeviceBySensorId(deviceId)) {
          return json(res, 409, { error: "device_id already registered" });
        }

        const data = await readJsonBody(req);
        const device = createDeviceRecord(data, deviceId);
        state.devices.push(device);
        const promotedReadings = promotePendingReadings(device, pending);
        state.pendingDevices.delete(deviceId);

        return json(res, 201, { device, promoted_readings: promotedReadings });
      }

      const pendingDeleteMatch = path.match(/^\/api\/pending-devices\/([^/]+)$/);
      if (pendingDeleteMatch && req.method === "DELETE") {
        const deviceId = decodeURIComponent(pendingDeleteMatch[1]);
        if (!state.pendingDevices.has(deviceId)) {
          return json(res, 404, { error: "pending device not found" });
        }

        state.pendingDevices.delete(deviceId);
        return json(res, 200, { ok: true });
      }

      return next();
    } catch (error) {
      return json(res, 500, {
        error: "sensor service error",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    middleware: handleRequest,
    setPort,
  };
}
