import { MapPin } from 'lucide-react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PropertyMiniMap({ listing }) {
  const hasCoordinates = Number.isFinite(listing?.latitude) && Number.isFinite(listing?.longitude);

  if (!hasCoordinates) {
    return (
      <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center">
        <div>
          <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No coordinates are recorded for this property, so a map cannot be shown.
          </p>
        </div>
      </div>
    );
  }

  const position = [listing.latitude, listing.longitude];

  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-border">
      <MapContainer
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} />
      </MapContainer>
    </div>
  );
}