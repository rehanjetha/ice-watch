import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { KEELE_CENTER, KEELE_ZOOM, getDefaultRadiusForLocation } from "@/data/campusLocations";
import { getMoistureDescriptor } from "@/lib/moistureUtils";
import { getHazardConfig } from "@/lib/hazardUtils";
import HazardBadge from "./HazardBadge";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function SensorMarker({ reading, showRawMoisture }) {
  const config = getHazardConfig(reading.hazard_level);
  const radius = reading.radius || getDefaultRadiusForLocation(reading.location_label);
  const moisture = getMoistureDescriptor(reading.moisture);

  const customIcon = L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${config.mapColor};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  return (
    <>
      <Circle
        center={[reading.latitude, reading.longitude]}
        radius={radius}
        pathOptions={{
          fillColor: config.mapColor,
          fillOpacity: config.mapOpacity,
          color: config.mapColor,
          weight: 1.5,
          opacity: 0.6,
        }}
      />
      <Marker position={[reading.latitude, reading.longitude]} icon={customIcon}>
        <Popup>
          <div className="min-w-[180px]">
            <p className="font-bold text-sm mb-1">{reading.location_label || "Sensor"}</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Temperature</span>
                <span className="font-semibold text-gray-900">{reading.temperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Moisture</span>
                <span className="font-semibold text-gray-900">
                  {showRawMoisture ? reading.moisture : moisture.label}
                </span>
              </div>
              {!showRawMoisture && <p className="text-[10px] text-gray-500">{moisture.detail}</p>}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <HazardBadge level={reading.hazard_level} />
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export default function CampusMap({ readings = [], className = "", showRawMoisture = true }) {
  return (
    <div className={`rounded-xl overflow-hidden border border-border ${className}`}>
      <MapContainer
        center={KEELE_CENTER}
        zoom={KEELE_ZOOM}
        className="h-full w-full"
        style={{ minHeight: "400px" }}
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {readings.map((reading, index) => (
          <SensorMarker key={reading.id || index} reading={reading} showRawMoisture={showRawMoisture} />
        ))}
      </MapContainer>
    </div>
  );
}
