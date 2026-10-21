import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPrice } from '@/lib/format';

const priceIcon = (label, active) =>
  L.divIcon({
    className: 'dm-pin-wrap',
    html: `<span class="dm-pin${active ? ' dm-pin-active' : ''}">${label}</span>`,
    iconSize: [78, 30],
    iconAnchor: [39, 28],
    popupAnchor: [0, -30],
  });

function FitBounds({ signature, points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    map.fitBounds(
      points.map((point) => [point.lat, point.lng]),
      { padding: [48, 48], maxZoom: 13 },
    );
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function ResultsMap({ listings = [], activeId, onSelect }) {
  const points = useMemo(
    () =>
      listings
        .filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude))
        .map((listing) => ({ id: listing.id, lat: listing.latitude, lng: listing.longitude })),
    [listings],
  );

  if (!points.length) {
    return (
      <div className="grid h-full min-h-[420px] place-items-center rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
        <div className="max-w-sm">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Map view unavailable for these results</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            None of the matching listings carry location coordinates, so the results are shown as a list
            only. Coordinates are added when a listing is created.
          </p>
        </div>
      </div>
    );
  }

  const signature = points.map((point) => `${point.id}:${point.lat}:${point.lng}`).join('|');

  return (
    <div className="h-full min-h-[420px] overflow-hidden rounded-2xl border border-border">
      <MapContainer center={[points[0].lat, points[0].lng]} zoom={11} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds signature={signature} points={points} />
        {listings
          .filter((listing) => Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude))
          .map((listing) => (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              icon={priceIcon(formatPrice(listing), activeId === listing.id)}
              eventHandlers={{ click: () => onSelect?.(listing.id) }}
            >
              <Popup>
                <Link to={`/property/${listing.id}`} className="text-xs font-semibold text-primary">
                  {listing.title}
                </Link>
                <p className="mt-1 text-xs font-semibold">
                  {formatPrice(listing)} · {listing.bedrooms ?? '—'} bd · {listing.bathrooms ?? '—'} ba
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {[listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ')}
                </p>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}