import { Map, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSensorData } from "@/lib/SensorDataContext";
import CampusMap from "../components/CampusMap";
import HazardLegend from "../components/HazardLegend";
import HazardBadge from "../components/HazardBadge";
import moment from "moment";

export default function MapPage() {
  const { latestByDevice, loading, refresh } = useSensorData();
  const readings = Object.values(latestByDevice);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Map className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Campus Map</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Ice & snow hazard zones across Keele Campus
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <CampusMap readings={readings} className="h-[calc(100vh-220px)] min-h-[400px]" />
        </div>
        <div className="space-y-4">
          <HazardLegend />

          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Sensor Locations
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {readings.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sensor data yet. Add sensors to begin monitoring.
                </p>
              )}
              {readings.map((r, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold truncate">
                      {r.location_label || "Unknown"}
                    </span>
                    <HazardBadge level={r.hazard_level} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>
                      Temp: <b className="text-foreground">{r.temperature}°C</b>
                    </span>
                    <span>
                      Moisture: <b className="text-foreground">{r.moisture}</b>
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {r.created_date ? moment(r.created_date).fromNow() : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
