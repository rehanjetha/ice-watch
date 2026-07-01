import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  addDevice as apiAddDevice,
  approvePendingDevice as apiApprovePendingDevice,
  checkServerHealth,
  deleteDevice as apiDeleteDevice,
  dismissPendingDevice as apiDismissPendingDevice,
  fetchDevices as apiFetchDevices,
  fetchPendingDevices as apiFetchPendingDevices,
  fetchReadings as apiFetchReadings,
  fetchScannerStatus as apiFetchScannerStatus,
  startScanner as apiStartScanner,
  stopScanner as apiStopScanner,
  updateDevice as apiUpdateDevice,
} from "@/api/sensorApi";
import { getDefaultRadiusForLocation } from "@/data/campusLocations";
import { calculateHazardLevel, DEMO_FREEZING_REFERENCE_TEMPERATURE_C } from "@/lib/hazardUtils";

const SensorDataContext = createContext();
const SENSOR_STALE_MS = 15000;
const FREEZING_REFERENCE_STORAGE_KEY = "icewatch-demo-freezing-reference-enabled";
const DEFAULT_SCANNER_STATUS = {
  server_online: false,
  intake_active: false,
  pending_count: 0,
  registered_count: 0,
  port: 5050,
};

const MOCK_SENSORS = [
  { device_id: "MOCK-001", device_name: "ESP32 Vari Hall", location_label: "Vari Hall", lat: 43.7731, lng: -79.5019, baseTemp: -1.0, baseMoisture: 2900 },
  { device_id: "MOCK-002", device_name: "ESP32 Scott Library", location_label: "Scott Library", lat: 43.7733, lng: -79.5043, baseTemp: 0.8, baseMoisture: 3100 },
  { device_id: "MOCK-003", device_name: "ESP32 Lassonde", location_label: "Lassonde Building", lat: 43.7737, lng: -79.5057, baseTemp: -4.2, baseMoisture: 2200 },
  { device_id: "MOCK-004", device_name: "ESP32 Student Centre", location_label: "Student Centre", lat: 43.7724, lng: -79.5002, baseTemp: 3.5, baseMoisture: 3400 },
  { device_id: "MOCK-005", device_name: "ESP32 Bergeron", location_label: "Bergeron Centre for Engineering Excellence", lat: 43.7745, lng: -79.5062, baseTemp: -2.1, baseMoisture: 2600 },
  { device_id: "MOCK-006", device_name: "ESP32 York Lanes", location_label: "York Lanes", lat: 43.7729, lng: -79.5008, baseTemp: 1.2, baseMoisture: 3300 },
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function computeHazard(temp, moisture, useDemoFreezingReference = false) {
  return calculateHazardLevel(
    temp,
    moisture,
    3250,
    useDemoFreezingReference ? DEMO_FREEZING_REFERENCE_TEMPERATURE_C : 0
  );
}

function generateMockReadings(prevReadings, useDemoFreezingReference = false) {
  const now = new Date().toISOString();
  return MOCK_SENSORS.map((sensor) => {
    const prev = prevReadings.find((reading) => reading.device_id === sensor.device_id);
    const prevTemp = prev ? prev.temperature : sensor.baseTemp;
    const prevMoist = prev ? prev.moisture : sensor.baseMoisture;

    const temp = clamp(prevTemp + (Math.random() - 0.5) * 1.2, sensor.baseTemp - 3, sensor.baseTemp + 3);
    const moisture = clamp(
      Math.round(prevMoist + (Math.random() - 0.5) * 200),
      sensor.baseMoisture - 400,
      sensor.baseMoisture + 400
    );

    return {
      id: `${sensor.device_id}-${Date.now()}`,
      device_id: sensor.device_id,
      temperature: Math.round(temp * 10) / 10,
      moisture,
      hazard_level: computeHazard(temp, moisture, useDemoFreezingReference),
      latitude: sensor.lat,
      longitude: sensor.lng,
      location_label: sensor.location_label,
      radius: getDefaultRadiusForLocation(sensor.location_label),
      created_date: now,
    };
  });
}

function generateMockDevices() {
  return MOCK_SENSORS.map((sensor) => ({
    id: sensor.device_id,
    device_name: sensor.device_name,
    device_id: sensor.device_id,
    latitude: sensor.lat,
    longitude: sensor.lng,
    location_label: sensor.location_label,
    status: "online",
    battery_level: 70 + Math.floor(Math.random() * 30),
    radius: getDefaultRadiusForLocation(sensor.location_label),
  }));
}

function getReadingTimestamp(reading) {
  const timestamp = new Date(reading?.created_date ?? 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getDerivedStatus(device, latestReading, now = Date.now()) {
  if (device.status === "maintenance") {
    return "maintenance";
  }

  if (!latestReading) {
    return "offline";
  }

  return now - getReadingTimestamp(latestReading) <= SENSOR_STALE_MS ? "online" : "offline";
}

function getInitialNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function getInitialDemoFreezingReferenceEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(FREEZING_REFERENCE_STORAGE_KEY) === "true";
}

export function SensorDataProvider({ children }) {
  const [readings, setReadings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [pendingDevices, setPendingDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [useDemoFreezingReference, setUseDemoFreezingReferenceState] = useState(getInitialDemoFreezingReferenceEnabled);
  const [scannerStatus, setScannerStatus] = useState(DEFAULT_SCANNER_STATUS);
  const [notificationPermission, setNotificationPermission] = useState(getInitialNotificationPermission);
  const initialLoad = useRef(true);
  const mockHistoryRef = useRef([]);
  const seenAlertKeysRef = useRef(new Set());
  const notificationsPrimedRef = useRef(false);

  const setUseDemoFreezingReference = useCallback((value) => {
    setUseDemoFreezingReferenceState((current) => {
      const nextValue = typeof value === "function" ? value(current) : value;
      const normalizedValue = Boolean(nextValue);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(FREEZING_REFERENCE_STORAGE_KEY, String(normalizedValue));
      }

      return normalizedValue;
    });
  }, []);

  const fetchAll = useCallback(async () => {
    if (mockMode) return;

    const [nextReadings, nextDevices, nextPendingDevices, nextScannerStatus] = await Promise.all([
      apiFetchReadings(),
      apiFetchDevices(),
      apiFetchPendingDevices(),
      apiFetchScannerStatus(),
    ]);

    setReadings(nextReadings);
    setDevices(nextDevices);
    setPendingDevices(nextPendingDevices);
    setScannerStatus(nextScannerStatus || DEFAULT_SCANNER_STATUS);
    setServerOnline(Boolean(nextScannerStatus?.server_online));

    if (initialLoad.current) {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [mockMode]);

  const checkHealth = useCallback(async () => {
    if (mockMode) return;
    const online = await checkServerHealth();
    setServerOnline(online);
  }, [mockMode]);

  const tickMock = useCallback(() => {
    const previousBatch =
      mockHistoryRef.current.length > 0 ? mockHistoryRef.current.slice(0, MOCK_SENSORS.length) : [];
    const nextReadings = generateMockReadings(previousBatch, useDemoFreezingReference);
    mockHistoryRef.current = [...nextReadings, ...mockHistoryRef.current].slice(0, 200);
    setReadings([...mockHistoryRef.current]);
    setDevices(generateMockDevices());
    setPendingDevices([]);
    setScannerStatus({
      ...DEFAULT_SCANNER_STATUS,
      server_online: false,
      intake_active: true,
      registered_count: MOCK_SENSORS.length,
    });
    setLoading(false);
  }, [useDemoFreezingReference]);

  useEffect(() => {
    if (mockMode) {
      tickMock();
      setServerOnline(false);
      notificationsPrimedRef.current = false;
      const interval = setInterval(tickMock, 5000);
      return () => clearInterval(interval);
    }

    mockHistoryRef.current = [];
    initialLoad.current = true;
    setLoading(true);
    fetchAll();
    checkHealth();

    const readingsInterval = setInterval(fetchAll, 5000);
    const healthInterval = setInterval(checkHealth, 10000);

    return () => {
      clearInterval(readingsInterval);
      clearInterval(healthInterval);
    };
  }, [mockMode, fetchAll, checkHealth, tickMock]);

  const calibratedPendingDevices = pendingDevices.map((pendingDevice) => ({
    ...pendingDevice,
    latest_preview: pendingDevice.latest_preview
      ? {
          ...pendingDevice.latest_preview,
          hazard_level: computeHazard(
            pendingDevice.latest_preview.temperature,
            pendingDevice.latest_preview.moisture,
            useDemoFreezingReference
          ),
        }
      : pendingDevice.latest_preview,
  }));

  const deviceLookup = devices.reduce((acc, device) => {
    acc[device.device_id] = device;
    return acc;
  }, {});

  const enrichedReadings = readings.map((reading) => {
    return {
      ...reading,
      hazard_level: computeHazard(reading.temperature, reading.moisture, useDemoFreezingReference),
      radius:
        reading.radius ??
        deviceLookup[reading.device_id]?.radius ??
        getDefaultRadiusForLocation(reading.location_label),
    };
  });

  const latestByDevice = {};
  enrichedReadings.forEach((reading) => {
    if (
      !latestByDevice[reading.device_id] ||
      new Date(reading.created_date) > new Date(latestByDevice[reading.device_id].created_date)
    ) {
      latestByDevice[reading.device_id] = reading;
    }
  });

  const now = Date.now();
  const enrichedDevices = devices.map((device) => {
    const latestReading = latestByDevice[device.device_id];
    const derivedStatus = getDerivedStatus(device, latestReading, now);

    return {
      ...device,
      radius: device.radius ?? getDefaultRadiusForLocation(device.location_label),
      status: derivedStatus,
      latestReading,
      lastSeenAt: latestReading?.created_date ?? null,
      isOnline: derivedStatus === "online",
    };
  });
  const activeSensorCount = enrichedDevices.filter((device) => device.isOnline).length;

  useEffect(() => {
    if (mockMode || loading) return;

    const alertReadings = Object.values(latestByDevice).filter(
      (reading) => reading?.hazard_level && reading.hazard_level !== "safe"
    );

    if (!notificationsPrimedRef.current) {
      alertReadings.forEach((reading) => {
        seenAlertKeysRef.current.add(`${reading.device_id}:${reading.created_date}:${reading.hazard_level}`);
      });
      notificationsPrimedRef.current = true;
      return;
    }

    if (notificationPermission !== "granted") return;

    alertReadings.forEach((reading) => {
      const key = `${reading.device_id}:${reading.created_date}:${reading.hazard_level}`;
      if (seenAlertKeysRef.current.has(key)) {
        return;
      }

      seenAlertKeysRef.current.add(key);
      const label = reading.location_label || reading.device_id;
      new Notification(`IceWatch alert: ${label}`, {
        body: `${reading.hazard_level.toUpperCase()} conditions detected at ${label}.`,
      });
    });
  }, [latestByDevice, loading, mockMode, notificationPermission]);

  const addDevice = useCallback(
    async (data) => {
      if (mockMode) return null;
      const result = await apiAddDevice(data);
      await fetchAll();
      return result;
    },
    [fetchAll, mockMode]
  );

  const updateDevice = useCallback(
    async (id, data) => {
      if (mockMode) return null;
      const result = await apiUpdateDevice(id, data);
      await fetchAll();
      return result;
    },
    [fetchAll, mockMode]
  );

  const deleteDevice = useCallback(
    async (id) => {
      if (mockMode) return null;
      const result = await apiDeleteDevice(id);
      await fetchAll();
      return result;
    },
    [fetchAll, mockMode]
  );

  const approvePendingDevice = useCallback(
    async (deviceId, data) => {
      if (mockMode) return null;
      const result = await apiApprovePendingDevice(deviceId, data);
      await fetchAll();
      return result;
    },
    [fetchAll, mockMode]
  );

  const dismissPendingDevice = useCallback(
    async (deviceId) => {
      if (mockMode) return null;
      const result = await apiDismissPendingDevice(deviceId);
      await fetchAll();
      return result;
    },
    [fetchAll, mockMode]
  );

  const startScanner = useCallback(async () => {
    if (mockMode) return DEFAULT_SCANNER_STATUS;
    const result = await apiStartScanner();
    if (result) {
      setScannerStatus(result);
    }
    await fetchAll();
    return result;
  }, [fetchAll, mockMode]);

  const stopScanner = useCallback(async () => {
    if (mockMode) return DEFAULT_SCANNER_STATUS;
    const result = await apiStopScanner();
    if (result) {
      setScannerStatus(result);
    }
    await fetchAll();
    return result;
  }, [fetchAll, mockMode]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return "unsupported";
    }

    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    return result;
  }, []);

  return (
    <SensorDataContext.Provider
      value={{
        readings: enrichedReadings,
        devices: enrichedDevices,
        pendingDevices: calibratedPendingDevices,
        latestByDevice,
        loading,
        serverOnline,
        scannerStatus: {
          ...scannerStatus,
          pending_count: pendingDevices.length,
          registered_count: enrichedDevices.length,
        },
        sensorIntakeActive: Boolean(scannerStatus?.intake_active),
        mockMode,
        setMockMode,
        useDemoFreezingReference,
        setUseDemoFreezingReference,
        freezingReferenceTemperature: useDemoFreezingReference ? DEMO_FREEZING_REFERENCE_TEMPERATURE_C : 0,
        activeSensorCount,
        sensorStaleMs: SENSOR_STALE_MS,
        notificationSupported: notificationPermission !== "unsupported",
        notificationPermission,
        requestNotificationPermission,
        addDevice,
        updateDevice,
        deleteDevice,
        approvePendingDevice,
        dismissPendingDevice,
        startScanner,
        stopScanner,
        refresh: mockMode ? tickMock : fetchAll,
      }}
    >
      {children}
    </SensorDataContext.Provider>
  );
}

export function useSensorData() {
  const context = useContext(SensorDataContext);
  if (!context) throw new Error("useSensorData must be used within SensorDataProvider");
  return context;
}
