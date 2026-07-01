import { ArrowRight, Cpu, Play, Pause, WifiOff, Radar, Activity } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { useSensorData } from "@/lib/SensorDataContext";
import { formatDeviceTitle } from "@/lib/deviceLabelUtils";

export default function ESP32DataFeed() {
  const {
    activeSensorCount,
    pendingDevices,
    readings,
    scannerStatus,
    sensorIntakeActive,
    serverOnline,
    startScanner,
    stopScanner,
  } = useSensorData();

  const recentReadings = readings.slice(0, 5);
  const latestPending = pendingDevices[0] || null;

  async function toggleIntake() {
    if (sensorIntakeActive) {
      await stopScanner();
    } else {
      await startScanner();
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex flex-col gap-4 p-4 border-b border-border bg-muted/30 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              sensorIntakeActive ? "bg-green-500/15" : "bg-amber-500/15"
            }`}
          >
            <Cpu className={`h-5 w-5 ${sensorIntakeActive ? "text-green-600" : "text-amber-600"}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">Sensor Intake Server</p>
            <p className="text-[11px] text-muted-foreground">
              {sensorIntakeActive
                ? `Listening on localhost:${scannerStatus.port || 5050}`
                : "Paused until you start intake from this page"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              serverOnline ? "bg-green-500/15 text-green-700" : "bg-red-500/15 text-red-700"
            }`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${serverOnline ? "bg-green-500" : "bg-red-500"}`} />
            {serverOnline ? "Backend online" : "Backend offline"}
          </div>
          <Button size="sm" onClick={toggleIntake} disabled={!serverOnline}>
            {sensorIntakeActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Intake
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Intake
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Registered Sensors
            </div>
            <p className="mt-2 text-2xl font-bold">{activeSensorCount}</p>
            <p className="text-xs text-muted-foreground">Currently reporting live data</p>
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Radar className="h-3.5 w-3.5" />
              Pending ESP32s
            </div>
            <p className="mt-2 text-2xl font-bold">{pendingDevices.length}</p>
            <p className="text-xs text-muted-foreground">Waiting for you to approve and place them</p>
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />
              Intake Flow
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground rounded-lg bg-muted/50 p-2.5">
              <span className="font-medium">ESP32</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium">Pending Review</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium">Assigned Sensor</span>
            </div>
          </div>
        </div>

        {!serverOnline && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <WifiOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">The backend is not reachable right now.</p>
              <p className="text-red-500 mt-0.5">
                Restart the website dev server, then use this page to begin or pause scanning.
              </p>
            </div>
          </div>
        )}

        {latestPending && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Latest Detection
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">
                {formatDeviceTitle(latestPending.device_name, latestPending.device_id)}
              </span>
              <span className="text-muted-foreground">{latestPending.device_id}</span>
              <span className="text-muted-foreground">
                Last seen {moment(latestPending.last_seen_at).fromNow()}
              </span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {recentReadings.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Approved Sensor Readings
              </p>
              <div className="rounded-lg bg-gray-950 p-3 font-mono text-[11px] space-y-1 max-h-36 overflow-auto">
                {recentReadings.map((reading, index) => (
                  <div key={reading.id || index} className="flex items-center gap-3 text-gray-300">
                    <span className="text-gray-600 shrink-0">
                      {reading.created_date ? moment(reading.created_date).format("HH:mm:ss") : "--:--"}
                    </span>
                    <span className="text-blue-400">{reading.temperature}°C</span>
                    <span className="text-cyan-400">M:{reading.moisture}</span>
                    <span
                      className={
                        reading.hazard_level === "danger"
                          ? "text-red-400"
                          : reading.hazard_level === "warning"
                          ? "text-orange-400"
                          : reading.hazard_level === "caution"
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    >
                      {(reading.hazard_level || "safe").toUpperCase()}
                    </span>
                    <span className="text-gray-600 truncate">{reading.device_id}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
