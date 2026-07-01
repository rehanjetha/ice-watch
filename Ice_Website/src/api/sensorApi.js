const API_BASE = import.meta.env.VITE_SENSOR_API_BASE || "/api";

function iceLevelToHazard(level) {
  const map = { 0: "safe", 1: "caution", 2: "warning", 3: "danger" };
  return map[level] ?? "safe";
}

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      try {
        error.payload = await response.json();
      } catch {
        error.payload = null;
      }
      throw error;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function normalizeReading(reading) {
  return {
    ...reading,
    hazard_level: reading.hazard_level || iceLevelToHazard(reading.ice_level),
  };
}

export async function fetchReadings() {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/readings`);
    return Array.isArray(data) ? data.map(normalizeReading) : [];
  } catch {
    return [];
  }
}

export async function fetchDevices() {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/devices`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchPendingDevices() {
  try {
    const data = await fetchWithTimeout(`${API_BASE}/pending-devices`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchScannerStatus() {
  try {
    return await fetchWithTimeout(`${API_BASE}/scanner/status`);
  } catch {
    return {
      server_online: false,
      intake_active: false,
      pending_count: 0,
      registered_count: 0,
      port: 5050,
    };
  }
}

export async function addDevice(deviceData) {
  try {
    return await fetchWithTimeout(`${API_BASE}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceData),
    });
  } catch {
    return null;
  }
}

export async function updateDevice(id, deviceData) {
  try {
    return await fetchWithTimeout(`${API_BASE}/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceData),
    });
  } catch {
    return null;
  }
}

export async function deleteDevice(id) {
  try {
    return await fetchWithTimeout(`${API_BASE}/devices/${id}`, {
      method: "DELETE",
    });
  } catch {
    return null;
  }
}

export async function approvePendingDevice(deviceId, deviceData) {
  try {
    return await fetchWithTimeout(`${API_BASE}/pending-devices/${deviceId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceData),
    });
  } catch {
    return null;
  }
}

export async function dismissPendingDevice(deviceId) {
  try {
    return await fetchWithTimeout(`${API_BASE}/pending-devices/${deviceId}`, {
      method: "DELETE",
    });
  } catch {
    return null;
  }
}

export async function startScanner() {
  try {
    return await fetchWithTimeout(`${API_BASE}/scanner/start`, { method: "POST" });
  } catch {
    return null;
  }
}

export async function stopScanner() {
  try {
    return await fetchWithTimeout(`${API_BASE}/scanner/stop`, { method: "POST" });
  } catch {
    return null;
  }
}

export async function checkServerHealth() {
  try {
    await fetchWithTimeout(`${API_BASE}/health`, {}, 3000);
    return true;
  } catch {
    return false;
  }
}
