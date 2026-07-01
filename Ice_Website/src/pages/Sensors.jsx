import { useState } from "react";
import {
  Battery,
  Check,
  Cpu,
  Lock,
  LogIn,
  MapPin,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import ESP32DataFeed from "@/components/ESP32DataFeed";
import HazardBadge from "@/components/HazardBadge";
import LocationPickerMap from "@/components/LocationPickerMap";
import { YORK_KEELE_LOCATIONS, getCampusLocation, getDefaultRadiusForLocation } from "@/data/campusLocations";
import { formatDeviceTitle, isGenericDeviceName } from "@/lib/deviceLabelUtils";
import { useSensorData } from "@/lib/SensorDataContext";

const EMPTY_FORM = {
  device_name: "",
  device_id: "",
  location_label: "",
  latitude: "",
  longitude: "",
  status: "online",
  battery_level: 100,
  radius: "",
};

function AdminLock({ onUnlock }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(event) {
    event.preventDefault();
    if (username === "admin" && password === "admin") {
      onUnlock();
    } else {
      setError("Invalid credentials. (Hint: admin / admin)");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border shadow-2xl p-8 w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This section is restricted to administrators.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </form>

        <p className="text-[11px] text-muted-foreground text-center mt-4">
          Demo mode · Default credentials: admin / admin
        </p>
      </motion.div>
    </div>
  );
}

function buildForm(defaults = {}) {
  return {
    ...EMPTY_FORM,
    ...defaults,
  };
}

function applyLocationToForm(currentForm, label) {
  const location = getCampusLocation(label);
  if (!location) return currentForm;

  return {
    ...currentForm,
    location_label: location.label,
    latitude: location.lat,
    longitude: location.lng,
    radius: location.defaultRadius || getDefaultRadiusForLocation(location.label),
  };
}

function serializeForm(form) {
  return {
    ...form,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    battery_level: Number(form.battery_level),
    radius: form.radius === "" ? null : Number(form.radius),
  };
}

function getFormCoordinates(form) {
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);

  return {
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

function formatLocationOption(location) {
  return location.code ? `${location.code} - ${location.label}` : location.label;
}

export default function Sensors() {
  const {
    addDevice,
    approvePendingDevice,
    deleteDevice,
    devices,
    dismissPendingDevice,
    loading,
    pendingDevices,
    refresh,
    sensorStaleMs,
    updateDevice,
  } = useSensorData();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(buildForm());
  const [radiusDrafts, setRadiusDrafts] = useState({});

  function openManualDialog() {
    setApprovalTarget(null);
    setForm(buildForm());
    setDialogOpen(true);
  }

  function openApprovalDialog(pendingDevice) {
    setApprovalTarget(pendingDevice);
    setForm(
      buildForm({
        device_name: isGenericDeviceName(pendingDevice.device_name, pendingDevice.device_id)
          ? ""
          : pendingDevice.device_name,
        device_id: pendingDevice.device_id,
      })
    );
    setApprovalDialogOpen(true);
  }

  function openEditDialog(device) {
    setEditTarget(device);
    setForm(
      buildForm({
        device_name: device.device_name,
        device_id: device.device_id,
        location_label: device.location_label,
        latitude: device.latitude,
        longitude: device.longitude,
        status: device.status,
        battery_level: device.battery_level ?? 100,
        radius: device.radius ?? getDefaultRadiusForLocation(device.location_label),
      })
    );
    setEditDialogOpen(true);
  }

  function selectLocation(label) {
    setForm((current) => applyLocationToForm(current, label));
  }

  function handleMapPick({ latitude, longitude }) {
    setForm((current) => ({
      ...current,
      latitude,
      longitude,
    }));
  }

  async function handleRegisterSensor() {
    const payload = serializeForm(form);
    const result = await addDevice(payload);
    if (!result) {
      toast({
        title: "Could not register sensor",
        description: "Please make sure the website dev server is running.",
      });
      return;
    }

    setDialogOpen(false);
    setForm(buildForm());
    toast({
      title: "Sensor added",
      description: "The ESP32 is now registered and ready for live readings.",
    });
  }

  async function handleApprovePendingDevice() {
    if (!approvalTarget) return;

    const payload = serializeForm(form);
    const result = await approvePendingDevice(approvalTarget.device_id, payload);
    if (!result) {
      toast({
        title: "Could not approve ESP32",
        description: "The pending device could not be assigned right now.",
      });
      return;
    }

    setApprovalDialogOpen(false);
    setApprovalTarget(null);
    setForm(buildForm());
    toast({
      title: "ESP32 approved",
      description: "The new device has been assigned and any buffered readings were promoted.",
    });
  }

  async function handleSaveLocation() {
    if (!editTarget) return;

    const result = await updateDevice(editTarget.id, {
      location_label: form.location_label,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    });

    if (!result) {
      toast({
        title: "Location update failed",
        description: "The sensor location could not be saved.",
      });
      return;
    }

    setEditDialogOpen(false);
    setEditTarget(null);
    setForm(buildForm());
    toast({
      title: "Location updated",
      description: "The sensor now uses the corrected map position.",
    });
  }

  async function handleDeleteDevice(id) {
    await deleteDevice(id);
    toast({
      title: "Sensor removed",
      description: "The sensor device has been removed from the dashboard.",
    });
  }

  async function handleDismissPending(deviceId) {
    await dismissPendingDevice(deviceId);
    toast({
      title: "Detection cleared",
      description: "The pending ESP32 was removed from the review queue.",
    });
  }

  async function handleSaveRadius(device) {
    const rawRadius = radiusDrafts[device.id];
    const nextRadius =
      rawRadius === undefined || rawRadius === ""
        ? getDefaultRadiusForLocation(device.location_label)
        : Number(rawRadius);

    const result = await updateDevice(device.id, {
      radius: Number.isFinite(nextRadius) ? nextRadius : null,
    });

    if (!result) {
      toast({
        title: "Radius update failed",
        description: "The radius could not be saved.",
      });
      return;
    }

    toast({
      title: "Radius updated",
      description: `Coverage radius for ${device.device_name} is now ${nextRadius}m.`,
    });
  }

  if (!isUnlocked) {
    return <AdminLock onUnlock={() => setIsUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Cpu className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sensor Devices</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Start or pause intake, review new ESP32 detections, and manage assigned campus sensors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openManualDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sensor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Sensor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Device Name</Label>
                    <Input
                      value={form.device_name}
                      onChange={(event) => setForm({ ...form, device_name: event.target.value })}
                      placeholder="ESP32 Vari Hall"
                    />
                  </div>
                  <div>
                    <Label>Device ID</Label>
                    <Input
                      value={form.device_id}
                      onChange={(event) => setForm({ ...form, device_id: event.target.value })}
                      placeholder="ESP-001"
                    />
                  </div>
                </div>

                <div>
                  <Label>Campus Location</Label>
                  <Select onValueChange={selectLocation} value={form.location_label}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {YORK_KEELE_LOCATIONS.map((location) => (
                          <SelectItem key={location.label} value={location.label}>
                            {formatLocationOption(location)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                    />
                  </div>
                </div>

                <LocationPickerMap
                  latitude={getFormCoordinates(form).latitude}
                  longitude={getFormCoordinates(form).longitude}
                  onPick={handleMapPick}
                />

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Battery %</Label>
                    <Input
                      type="number"
                      value={form.battery_level}
                      onChange={(event) => setForm({ ...form, battery_level: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Radius (m)</Label>
                    <Input
                      type="number"
                      value={form.radius}
                      onChange={(event) => setForm({ ...form, radius: event.target.value })}
                      placeholder="80"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleRegisterSensor}
                  disabled={!form.device_name || !form.device_id || !form.location_label}
                >
                  Register Sensor
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <ESP32DataFeed />

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve New ESP32</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Incoming Device
              </p>
              <div className="mt-2 text-sm space-y-1">
                <p className="font-semibold">
                  {formatDeviceTitle(approvalTarget?.device_name, approvalTarget?.device_id)}
                </p>
                <p className="text-muted-foreground">{approvalTarget?.device_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Device Name</Label>
                <Input
                  value={form.device_name}
                  onChange={(event) => setForm({ ...form, device_name: event.target.value })}
                  placeholder={approvalTarget?.device_id || "Sensor name"}
                />
              </div>
              <div>
                <Label>Device ID</Label>
                <Input value={form.device_id} disabled />
              </div>
            </div>

            <div>
              <Label>Campus Location</Label>
              <Select onValueChange={selectLocation} value={form.location_label}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign this ESP32 to a campus location" />
                </SelectTrigger>
                <SelectContent>
                  {YORK_KEELE_LOCATIONS.map((location) => (
                    <SelectItem key={location.label} value={location.label}>
                      {formatLocationOption(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                />
              </div>
            </div>

            <LocationPickerMap
              latitude={getFormCoordinates(form).latitude}
              longitude={getFormCoordinates(form).longitude}
              onPick={handleMapPick}
            />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Battery %</Label>
                <Input
                  type="number"
                  value={form.battery_level}
                  onChange={(event) => setForm({ ...form, battery_level: event.target.value })}
                />
              </div>
              <div>
                <Label>Radius (m)</Label>
                <Input
                  type="number"
                  value={form.radius}
                  onChange={(event) => setForm({ ...form, radius: event.target.value })}
                  placeholder="80"
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleApprovePendingDevice}
              disabled={!form.location_label}
            >
              Assign and Activate Sensor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Sensor Location</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="text-sm font-semibold">
                {formatDeviceTitle(editTarget?.device_name, editTarget?.device_id)}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">{editTarget?.device_id}</p>
            </div>

            <div>
              <Label>Campus Location</Label>
              <Select onValueChange={selectLocation} value={form.location_label}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the closest mapped location" />
                </SelectTrigger>
                <SelectContent>
                  {YORK_KEELE_LOCATIONS.map((location) => (
                    <SelectItem key={location.label} value={location.label}>
                      {formatLocationOption(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                />
              </div>
            </div>

            <LocationPickerMap
              latitude={getFormCoordinates(form).latitude}
              longitude={getFormCoordinates(form).longitude}
              onPick={handleMapPick}
            />

            <Button
              className="w-full"
              onClick={handleSaveLocation}
              disabled={!form.location_label}
            >
              Save Corrected Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold">Pending ESP32 Detections</h2>
        </div>

        {pendingDevices.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <p className="font-medium">No unassigned ESP32 devices waiting right now.</p>
            <p className="text-sm text-muted-foreground mt-1">
              When intake is running, newly discovered boards will show up here for approval instead of being auto-assigned.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {pendingDevices.map((pendingDevice) => (
              <motion.div
                key={pendingDevice.device_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-amber-500/20 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {formatDeviceTitle(pendingDevice.device_name, pendingDevice.device_id)}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">{pendingDevice.device_id}</p>
                  </div>
                  <HazardBadge level={pendingDevice.latest_preview?.hazard_level || "safe"} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-muted-foreground">Temperature</p>
                    <p className="font-semibold mt-1">{pendingDevice.latest_preview?.temperature ?? "--"}°C</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-muted-foreground">Moisture</p>
                    <p className="font-semibold mt-1">{pendingDevice.latest_preview?.moisture ?? "--"}</p>
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>Detected {moment(pendingDevice.first_seen_at).fromNow()}</p>
                  <p>Most recent packet {moment(pendingDevice.last_seen_at).fromNow()}</p>
                  <p>{pendingDevice.reading_count} buffered reading(s) waiting for assignment</p>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" size="sm" onClick={() => openApprovalDialog(pendingDevice)}>
                    <Check className="h-4 w-4 mr-2" />
                    Add and Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/20 text-red-600 hover:text-red-700"
                    onClick={() => handleDismissPending(pendingDevice.device_id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {devices.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Cpu className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No Sensors Registered</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start intake to detect new ESP32 boards, or add a sensor manually if you already know where it belongs.
          </p>
          <Button onClick={openManualDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Sensor
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Assigned Sensors</h2>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.map((device) => {
              const reading = device.latestReading;
              const radiusValue =
                radiusDrafts[device.id] ?? String(device.radius ?? getDefaultRadiusForLocation(device.location_label));

              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2">
                      {device.status === "online" ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold text-sm">
                        {formatDeviceTitle(device.device_name, device.device_id)}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteDevice(device.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mb-1">{device.location_label}</p>
                  <p className="text-[10px] text-muted-foreground mb-1 font-mono">
                    {Number(device.latitude).toFixed(6)}, {Number(device.longitude).toFixed(6)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mb-2">ID: {device.device_id}</p>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Status: {device.status === "online" ? "Online" : device.status === "maintenance" ? "Maintenance" : "Offline"}
                    {device.status === "offline" ? ` · No reading in ${(sensorStaleMs / 1000).toFixed(0)}s` : ""}
                  </p>

                  {reading ? (
                    <div className="space-y-2 border-t border-border pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Temperature</span>
                        <span className="font-semibold">{reading.temperature}°C</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Moisture</span>
                        <span className="font-semibold">{reading.moisture}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Hazard</span>
                        <HazardBadge level={reading.hazard_level} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {reading.created_date ? moment(reading.created_date).fromNow() : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">No approved readings yet</p>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mt-3">
                    <Battery className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {device.battery_level ?? "--"}%
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => openEditDialog(device)}>
                      <MapPin className="h-4 w-4 mr-2" />
                      Correct Location
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label className="text-xs">Coverage Radius (m)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={radiusValue}
                        onChange={(event) =>
                          setRadiusDrafts((current) => ({
                            ...current,
                            [device.id]: event.target.value,
                          }))
                        }
                      />
                      <Button size="sm" variant="outline" onClick={() => handleSaveRadius(device)}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
