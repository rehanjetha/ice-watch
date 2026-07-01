import { Thermometer, Droplets, AlertTriangle, Cpu, Snowflake } from "lucide-react";
import { motion } from "framer-motion";
import { useSensorData } from "@/lib/SensorDataContext";
import StatCard from "../components/StatCard";
import CampusMap from "../components/CampusMap";
import HazardLegend from "../components/HazardLegend";
import HazardBadge from "../components/HazardBadge";
import ReadingsChart from "../components/ReadingsChart";
import { describeAverageMoisture } from "../lib/moistureUtils";

export default function Dashboard() {
  const { readings, latestByDevice, devices, loading, activeSensorCount } = useSensorData();
  const latestReadings = Object.values(latestByDevice);

  const rawAvgTemp =
    latestReadings.length > 0
      ? +(latestReadings.reduce((sum, r) => sum + r.temperature, 0) / latestReadings.length).toFixed(1)
      : null;
  const avgTemp = rawAvgTemp === null ? "--" : Object.is(rawAvgTemp, -0) ? "0.0" : String(rawAvgTemp);
  const avgMoisture = describeAverageMoisture(latestReadings);
  const dangerZones = latestReadings.filter(
    (r) => r.hazard_level === "danger" || r.hazard_level === "warning"
  ).length;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Snowflake className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Campus Conditions</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Real-time ice and snow monitoring · York University Keele Campus
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Thermometer}
          label="Avg Temperature"
          value={avgTemp}
          unit="°C"
          subtitle="Across all sensors"
          color="bg-blue-500"
        />
        <StatCard
          icon={Droplets}
          label="Avg Moisture"
          value={avgMoisture.label}
          subtitle={avgMoisture.detail}
          color="bg-cyan-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Hazard Zones"
          value={dangerZones}
          subtitle="Warning + Danger"
          color="bg-orange-500"
        />
        <StatCard
          icon={Cpu}
          label="Sensors Online"
          value={`${activeSensorCount}/${devices.length}`}
          subtitle="Active devices"
          color="bg-green-500"
        />
      </div>

      {/* Map + Legend */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <CampusMap readings={latestReadings} className="h-[400px] md:h-[500px]" showRawMoisture={false} />
        </div>
        <div className="space-y-4">
          <HazardLegend />

          {/* Recent Alerts */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Active Zones
            </h3>
            <div className="space-y-2.5">
              {latestReadings.length === 0 && (
                <p className="text-sm text-muted-foreground">No sensor data yet</p>
              )}
              {latestReadings.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate mr-2">
                    {r.location_label || r.device_id}
                  </span>
                  <HazardBadge level={r.hazard_level} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Temperature History</h3>
          <ReadingsChart readings={readings} dataKey="temperature" label="Temp (°C)" color="hsl(213, 94%, 52%)" />
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">Moisture History</h3>
          <ReadingsChart readings={readings} dataKey="moisture" label="Moisture" color="hsl(199, 89%, 48%)" />
        </div>
      </div>
    </div>
  );
}
