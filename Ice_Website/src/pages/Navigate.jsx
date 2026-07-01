import { useDeferredValue, useEffect, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  AlertTriangle,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Route,
  Ruler,
  Search,
  Shield,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HazardBadge from "@/components/HazardBadge";
import { useSensorData } from "@/lib/SensorDataContext";
import { fetchOSRMRoute } from "@/lib/osrmRoute";
import { getHazardConfig } from "@/lib/hazardUtils";
import {
  KEELE_CENTER,
  YORK_KEELE_LOCATIONS,
  getDefaultRadiusForLocation,
  searchCampusLocations,
} from "@/data/campusLocations";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function routeTouchesHazard(coords, hazards) {
  return hazards.some((hazard) =>
    coords.some((point) => haversine(point, [hazard.latitude, hazard.longitude]) <= hazard.radius + 20)
  );
}

function hazardsAlongRoute(coords, hazards) {
  return hazards.filter((hazard) =>
    coords.some((point) => haversine(point, [hazard.latitude, hazard.longitude]) <= hazard.radius + 20)
  );
}

function combineRoutes(firstLeg, secondLeg) {
  return {
    coords: [...firstLeg.coords, ...secondLeg.coords.slice(1)],
    distance: firstLeg.distance + secondLeg.distance,
    duration: firstLeg.duration + secondLeg.duration,
    fallback: firstLeg.fallback || secondLeg.fallback,
    provider: `${firstLeg.provider} + ${secondLeg.provider}`,
    steps: [...(firstLeg.steps || []), ...(secondLeg.steps || [])],
  };
}

function scoreWaypoint(fromLocation, toLocation, waypoint) {
  const directDistance = haversine([fromLocation.lat, fromLocation.lng], [toLocation.lat, toLocation.lng]);
  const waypointDistance =
    haversine([fromLocation.lat, fromLocation.lng], [waypoint.lat, waypoint.lng]) +
    haversine([waypoint.lat, waypoint.lng], [toLocation.lat, toLocation.lng]);
  return waypointDistance - directDistance;
}

async function buildSafeRoute(fromLocation, toLocation, hazards) {
  const directRoute = await fetchOSRMRoute(
    fromLocation.lat,
    fromLocation.lng,
    toLocation.lat,
    toLocation.lng
  );

  if (!routeTouchesHazard(directRoute.coords, hazards)) {
    return { route: directRoute, waypoint: null };
  }

  const candidates = YORK_KEELE_LOCATIONS.filter(
    (location) =>
      location.label !== fromLocation.label &&
      location.label !== toLocation.label &&
      !hazards.some(
        (hazard) =>
          haversine([location.lat, location.lng], [hazard.latitude, hazard.longitude]) <= hazard.radius + 25
      )
  )
    .map((location) => ({ ...location, score: scoreWaypoint(fromLocation, toLocation, location) }))
    .filter((location) => location.score < 1200)
    .sort((left, right) => left.score - right.score)
    .slice(0, 6);

  let bestRoute = {
    route: directRoute,
    waypoint: null,
    hazardCount: hazardsAlongRoute(directRoute.coords, hazards).length,
  };

  for (const candidate of candidates) {
    const [firstLeg, secondLeg] = await Promise.all([
      fetchOSRMRoute(fromLocation.lat, fromLocation.lng, candidate.lat, candidate.lng),
      fetchOSRMRoute(candidate.lat, candidate.lng, toLocation.lat, toLocation.lng),
    ]);

    const mergedRoute = combineRoutes(firstLeg, secondLeg);
    const nearbyHazards = hazardsAlongRoute(mergedRoute.coords, hazards);

    if (nearbyHazards.length === 0) {
      return { route: mergedRoute, waypoint: candidate };
    }

    if (
      nearbyHazards.length < bestRoute.hazardCount ||
      (nearbyHazards.length === bestRoute.hazardCount && mergedRoute.distance < bestRoute.route.distance)
    ) {
      bestRoute = {
        route: mergedRoute,
        waypoint: candidate,
        hazardCount: nearbyHazards.length,
      };
    }
  }

  return { route: bestRoute.route, waypoint: bestRoute.waypoint };
}

function buildingIcon(color = "#3b82f6") {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords?.length > 1) {
      map.fitBounds(coords, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
}

function LocationSearchField({
  activeField,
  excludeLabel,
  fieldKey,
  label,
  onQueryChange,
  onSelect,
  query,
  selectedLocation,
  setActiveField,
}) {
  const deferredQuery = useDeferredValue(query);
  const results = searchCampusLocations(deferredQuery)
    .filter((location) => location.label !== excludeLabel)
    .slice(0, deferredQuery ? 10 : 8);

  return (
    <div className="relative">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onFocus={() => setActiveField(fieldKey)}
          onBlur={() => window.setTimeout(() => setActiveField(null), 120)}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pl-9"
          placeholder={`Search ${label.toLowerCase()}...`}
        />
      </div>

      {selectedLocation && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Selected: {selectedLocation.label}
        </p>
      )}

      {activeField === fieldKey && (
        <div className="absolute left-0 right-0 z-[1200] mt-2 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-auto">
            {results.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">No matching locations.</div>
            ) : (
              results.map((location) => (
                <button
                  key={location.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(location)}
                  className="w-full px-3 py-3 text-left hover:bg-muted/60 transition-colors border-b border-border/60 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{location.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {location.category}
                        {location.code ? ` · ${location.code}` : ""}
                      </p>
                    </div>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function findExactLocationMatch(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  return (
    YORK_KEELE_LOCATIONS.find((location) => {
      const candidates = [location.label, location.code, ...(location.aliases || [])];
      return candidates.some((candidate) => candidate?.toLowerCase() === normalizedQuery);
    }) || null
  );
}

export default function Navigate() {
  const { latestByDevice } = useSensorData();
  const readings = Object.values(latestByDevice);
  const hazardZones = readings
    .filter((reading) => reading.hazard_level !== "safe")
    .map((reading) => ({
      ...reading,
      radius: reading.radius || getDefaultRadiusForLocation(reading.location_label),
    }));

  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [step, setStep] = useState("pick");
  const [routeType, setRouteType] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [activeField, setActiveField] = useState(null);

  function selectLocation(location, type) {
    if (type === "from") {
      setFromLocation(location);
      setFromQuery(location.label);
    } else {
      setToLocation(location);
      setToQuery(location.label);
    }
    setActiveField(null);
  }

  function handleQueryChange(value, type) {
    const exactMatch = findExactLocationMatch(value);

    if (type === "from") {
      setFromQuery(value);
      setFromLocation(exactMatch);
    } else {
      setToQuery(value);
      setToLocation(exactMatch);
    }

    setRouteCoords(null);
    setRouteInfo(null);
    setRouteType(null);
    setRouteError(null);
    setStep("pick");
  }

  async function buildRoute(type) {
    if (!fromLocation || !toLocation) return;

    setStep("loading");
    setRouteError(null);
    setRouteType(type);

    try {
      const { route, waypoint } =
        type === "safe"
          ? await buildSafeRoute(fromLocation, toLocation, hazardZones)
          : { route: await fetchOSRMRoute(fromLocation.lat, fromLocation.lng, toLocation.lat, toLocation.lng), waypoint: null };

      const nearbyHazards = hazardsAlongRoute(route.coords, hazardZones);

      setRouteCoords(route.coords);
      setRouteInfo({
        distance: Math.round(route.distance),
        walkMins: Math.ceil(route.duration / 60),
        hazards: nearbyHazards,
        waypoint,
        fallback: route.fallback,
        provider: route.provider,
      });
      setStep("navigating");
    } catch {
      setRouteError("Could not fetch a campus path right now. Please try again in a moment.");
      setStep("choose");
    }
  }

  function reset() {
    setFromQuery("");
    setToQuery("");
    setFromLocation(null);
    setToLocation(null);
    setRouteCoords(null);
    setRouteInfo(null);
    setRouteType(null);
    setRouteError(null);
    setActiveField(null);
    setStep("pick");
  }

  const canProceed = fromLocation && toLocation && fromLocation.label !== toLocation.label;

  return (
    <div className="flex flex-col md:flex-row" style={{ height: "calc(100vh - 56px)" }}>
      <div className="w-full md:w-96 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col p-5 overflow-auto shrink-0 md:max-h-full max-h-[28rem]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Navigation className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Campus Navigator</p>
            <p className="text-[11px] text-muted-foreground">York University · Keele Campus</p>
          </div>
          {(routeCoords || fromLocation || toLocation) && (
            <button
              onClick={reset}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <LocationSearchField
            activeField={activeField}
            excludeLabel={toLocation?.label}
            fieldKey="from"
            label="From"
            onQueryChange={(value) => handleQueryChange(value, "from")}
            onSelect={(location) => selectLocation(location, "from")}
            query={fromQuery}
            selectedLocation={fromLocation}
            setActiveField={setActiveField}
          />

          <LocationSearchField
            activeField={activeField}
            excludeLabel={fromLocation?.label}
            fieldKey="to"
            label="To"
            onQueryChange={(value) => handleQueryChange(value, "to")}
            onSelect={(location) => selectLocation(location, "to")}
            query={toQuery}
            selectedLocation={toLocation}
            setActiveField={setActiveField}
          />
        </div>

        {routeError && (
          <div className="mt-4 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {routeError}
          </div>
        )}

        <AnimatePresence>
          {canProceed && (step === "pick" || step === "choose" || step === "loading") && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-2"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Choose Route
              </p>

              <button
                onClick={() => buildRoute("safe")}
                disabled={step === "loading"}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  step === "loading" && routeType === "safe"
                    ? "border-green-500 bg-green-500/10"
                    : "border-green-500/40 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500"
                } disabled:opacity-60`}
              >
                <div className="h-9 w-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  {step === "loading" && routeType === "safe" ? (
                    <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-green-700">Safer Route</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    Uses walkable campus paths and only detours when hazard circles overlap the route.
                  </p>
                </div>
              </button>

              <button
                onClick={() => buildRoute("fast")}
                disabled={step === "loading"}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                  step === "loading" && routeType === "fast"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500"
                } disabled:opacity-60`}
              >
                <div className="h-9 w-9 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  {step === "loading" && routeType === "fast" ? (
                    <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-orange-700">Most Direct Route</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    Follows the shortest available walking path, even if hazards are nearby.
                  </p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === "navigating" && routeInfo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-3"
            >
              <div
                className={`rounded-xl p-3.5 border-2 ${
                  routeType === "safe" ? "bg-green-500/10 border-green-500/30" : "bg-orange-500/10 border-orange-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {routeType === "safe" ? (
                    <Shield className="h-4 w-4 text-green-600" />
                  ) : (
                    <Zap className="h-4 w-4 text-orange-600" />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      routeType === "safe" ? "text-green-700" : "text-orange-700"
                    }`}
                  >
                    {routeType === "safe" ? "Safer Route" : "Most Direct Route"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/60 rounded-lg p-2.5 text-center">
                    <Ruler className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                    <p className="font-bold text-foreground">
                      {routeInfo.distance < 1000
                        ? `${routeInfo.distance}m`
                        : `${(routeInfo.distance / 1000).toFixed(1)}km`}
                    </p>
                    <p className="text-muted-foreground text-[10px]">Distance</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2.5 text-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                    <p className="font-bold text-foreground">~{routeInfo.walkMins} min</p>
                    <p className="text-muted-foreground text-[10px]">Walk time</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Routing provider</span>
                  <span className="font-medium text-foreground">{routeInfo.provider}</span>
                </div>
                {routeInfo.waypoint && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Detour waypoint</span>
                    <span className="font-medium text-foreground">{routeInfo.waypoint.label}</span>
                  </div>
                )}
              </div>

              {routeInfo.fallback && (
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-700 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Straight-line approximation was used only because both public routing providers failed.
                </div>
              )}

              {routeInfo.hazards.length > 0 ? (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <p className="text-xs font-semibold text-red-700">
                      {routeInfo.hazards.length} hazard{routeInfo.hazards.length > 1 ? "s" : ""} near route
                    </p>
                  </div>
                  {routeInfo.hazards.slice(0, 4).map((hazard, index) => (
                    <div key={`${hazard.device_id}-${index}`} className="flex items-center justify-between text-xs py-1">
                      <span className="text-muted-foreground truncate mr-2">{hazard.location_label}</span>
                      <HazardBadge level={hazard.hazard_level} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-700 flex items-center gap-2">
                  <Route className="h-3.5 w-3.5 shrink-0" />
                  No active hazard circles overlap this route.
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={() => setStep("choose")}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Compare Route Types
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={KEELE_CENTER}
          zoom={15}
          className="h-full w-full"
          style={{ minHeight: "300px" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {hazardZones.map((reading, index) => {
            const config = getHazardConfig(reading.hazard_level);
            return (
              <Circle
                key={`${reading.device_id}-${index}`}
                center={[reading.latitude, reading.longitude]}
                radius={reading.radius}
                pathOptions={{
                  fillColor: config.mapColor,
                  fillOpacity: config.mapOpacity,
                  color: config.mapColor,
                  weight: 1.5,
                  opacity: 0.5,
                }}
              />
            );
          })}

          {fromLocation && (
            <Marker position={[fromLocation.lat, fromLocation.lng]} icon={buildingIcon("#6366f1")}>
              <Popup>
                <div className="font-semibold text-sm">{fromLocation.label}</div>
                <div className="text-xs text-indigo-600 mt-0.5">Start</div>
              </Popup>
            </Marker>
          )}

          {toLocation && (
            <Marker position={[toLocation.lat, toLocation.lng]} icon={buildingIcon("#3b82f6")}>
              <Popup>
                <div className="font-semibold text-sm">{toLocation.label}</div>
                <div className="text-xs text-blue-600 mt-0.5">Destination</div>
              </Popup>
            </Marker>
          )}

          {routeCoords && (
            <>
              <Polyline positions={routeCoords} pathOptions={{ color: "#000", weight: 9, opacity: 0.12 }} />
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: routeType === "safe" ? "#22c55e" : "#f97316",
                  weight: 5,
                  opacity: 0.9,
                  dashArray: routeInfo?.fallback || routeType === "fast" ? "12 6" : undefined,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </>
          )}

          {routeCoords && <FitBounds coords={routeCoords} />}
        </MapContainer>

        {!routeCoords && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-white/95 backdrop-blur rounded-xl border border-border shadow-lg p-3 z-[1000] text-xs space-y-1.5 max-w-sm">
            <p className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
              Searchable Campus Destinations
            </p>
            <p className="text-muted-foreground">
              Search York buildings, residences, subway stations, and nearby spots like Quad at York from the sidebar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
