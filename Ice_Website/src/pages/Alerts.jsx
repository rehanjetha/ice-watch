import { Bell, AlertTriangle, Snowflake, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useSensorData } from "@/lib/SensorDataContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import HazardBadge from "../components/HazardBadge";
import { getHazardConfig } from "../lib/hazardUtils";
import moment from "moment";

export default function Alerts() {
  const {
    readings,
    loading,
    notificationPermission,
    notificationSupported,
    requestNotificationPermission,
  } = useSensorData();
  const [filter, setFilter] = useState("all");

  const alerts = readings.filter((r) => r.hazard_level !== "safe");
  const filtered = filter === "all" ? alerts : alerts.filter((r) => r.hazard_level === filter);

  const dangerCount = alerts.filter((r) => r.hazard_level === "danger").length;
  const warningCount = alerts.filter((r) => r.hazard_level === "warning").length;
  const cautionCount = alerts.filter((r) => r.hazard_level === "caution").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alerts & Warnings</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Snow and ice hazard alerts from campus sensors
        </p>
      </motion.div>

      <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-sm">Browser notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            Get a web notification when a new live alert appears while this app is open.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {!notificationSupported
              ? "Unsupported"
              : notificationPermission === "granted"
              ? "Enabled"
              : notificationPermission === "denied"
              ? "Blocked"
              : "Not enabled"}
          </div>
          <Button
            size="sm"
            variant={notificationPermission === "granted" ? "outline" : "default"}
            onClick={requestNotificationPermission}
            disabled={!notificationSupported || notificationPermission === "granted"}
          >
            {notificationPermission === "granted" ? "Notifications On" : "Enable Notifications"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-500">{dangerCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Danger</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
          <Snowflake className="h-5 w-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-orange-500">{warningCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Warning</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <Shield className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-500">{cautionCount}</p>
          <p className="text-[11px] text-muted-foreground font-medium">Caution</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "danger", "warning", "caution"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "All Alerts" : getHazardConfig(f).label}
            {f === "all"
              ? ` (${alerts.length})`
              : ` (${alerts.filter((r) => r.hazard_level === f).length})`}
          </button>
        ))}
      </div>

      {/* Alert List */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="h-12 w-12 text-green-500/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">All Clear</h3>
          <p className="text-sm text-muted-foreground">No active hazard alerts at this time.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert, i) => {
            const config = getHazardConfig(alert.hazard_level);
            return (
              <motion.div
                key={alert.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-card rounded-xl border-l-4 border border-border p-4 flex items-center justify-between ${config.borderClass}`}
                style={{ borderLeftColor: config.mapColor }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.bgClass}`}
                  >
                    <Snowflake className={`h-5 w-5 ${config.textClass}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {alert.location_label || alert.device_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.temperature}°C · Moisture: {alert.moisture}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {alert.created_date ? moment(alert.created_date).fromNow() : ""}
                    </p>
                  </div>
                </div>
                <HazardBadge level={alert.hazard_level} size="lg" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
