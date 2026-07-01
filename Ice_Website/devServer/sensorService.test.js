import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createSensorService } from "./sensorService";

function makeRequest(method, url, body = null) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  req.method = method;
  req.url = url;
  req.headers = { host: "localhost:5173" };
  return req;
}

function makeResponse() {
  return {
    body: "",
    headers: {},
    statusCode: 200,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(payload) {
      this.body = payload;
    },
    json() {
      return JSON.parse(this.body);
    },
  };
}

async function request(service, method, url, body = null) {
  const req = makeRequest(method, url, body);
  const res = makeResponse();
  let passedThrough = false;

  await service.middleware(req, res, () => {
    passedThrough = true;
  });

  return { res, passedThrough };
}

describe("sensor service middleware", () => {
  it("passes non-API requests through to Vite", async () => {
    const service = createSensorService();
    const { passedThrough } = await request(service, "GET", "/");

    expect(passedThrough).toBe(true);
  });

  it("gates ESP32 readings until intake is active and the device is approved", async () => {
    const service = createSensorService();

    const paused = await request(service, "POST", "/api/esp32/data", {
      device_id: "ESP-TEST",
      temperature: -2,
      moisture: 1200,
      ice_level: 3,
    });
    expect(paused.res.statusCode).toBe(503);

    const started = await request(service, "POST", "/api/scanner/start");
    expect(started.res.json().intake_active).toBe(true);

    const pending = await request(service, "POST", "/api/esp32/data", {
      device_id: "ESP-TEST",
      device_name: "ESP32 Sensor",
      temperature: -2,
      moisture: 1200,
      ice_level: 3,
    });
    expect(pending.res.statusCode).toBe(202);
    expect(pending.res.json().pending).toBe(true);

    const pendingDevices = await request(service, "GET", "/api/pending-devices");
    expect(pendingDevices.res.json()).toHaveLength(1);

    const approved = await request(service, "POST", "/api/pending-devices/ESP-TEST/approve", {
      device_name: "Vari Hall Ice Node",
      latitude: 43.7727754,
      longitude: -79.5034066,
      location_label: "Vari Hall",
      radius: 100,
    });
    expect(approved.res.statusCode).toBe(201);
    expect(approved.res.json().promoted_readings).toBe(1);

    const readings = await request(service, "GET", "/api/readings");
    expect(readings.res.json()[0]).toMatchObject({
      device_id: "ESP-TEST",
      hazard_level: "danger",
      location_label: "Vari Hall",
    });
  });
});
