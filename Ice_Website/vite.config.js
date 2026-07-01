import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createSensorService } from "./devServer/sensorService.js";

function sensorApiPlugin() {
  const service = createSensorService();

  return {
    name: "icewatch-sensor-api",
    configureServer(server) {
      service.setPort(server.config.server.port || 5173);
      server.middlewares.use(service.middleware);
    },
    configurePreviewServer(server) {
      service.setPort(server.config.preview.port || 4173);
      server.middlewares.use(service.middleware);
    },
  };
}

export default defineConfig({
  logLevel: "error",
  plugins: [react(), sensorApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
