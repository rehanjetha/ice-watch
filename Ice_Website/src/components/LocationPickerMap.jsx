import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { KEELE_CENTER } from "@/data/campusLocations";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      });
    },
  });

  return null;
}

function SyncView({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), 17), {
        duration: 0.5,
      });
    }
  }, [latitude, longitude, map]);

  return null;
}

export default function LocationPickerMap({ latitude, longitude, onPick }) {
  const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Click the map to place the sensor exactly where it should sit.
      </div>
      <div className="rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={hasPoint ? [latitude, longitude] : KEELE_CENTER}
          zoom={16}
          className="h-64 w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={onPick} />
          <SyncView latitude={latitude} longitude={longitude} />
          {hasPoint && <Marker position={[latitude, longitude]} />}
        </MapContainer>
      </div>
    </div>
  );
}
