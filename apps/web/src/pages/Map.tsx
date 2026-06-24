import { useQuery } from '@tanstack/react-query';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import * as React from 'react';
import { GeoJSON, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { MemberAvatar, PageHeader, PartyBadge } from '@/components/common';
import { api, type DistrictCollection, type DistrictFeature } from '@/lib/api';
import { partyColor } from '@/lib/format';
import { useStateCtx, useStateLabels } from '@/lib/state';
import { cn } from '@/lib/utils';

type Chamber = 'assembly' | 'senate';

function ClickProbe({ onPick }: { onPick: (lng: number, lat: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
}

export default function MapPage() {
  const [layer, setLayer] = React.useState<Chamber>('assembly');
  const [picked, setPicked] = React.useState<{ assembly?: DistrictFeature; senate?: DistrictFeature } | null>(
    null,
  );
  const sl = useStateLabels();
  const { state } = useStateCtx();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geoRef = React.useRef<any>(null);

  const asm = useQuery({ queryKey: ['districts', state, 'assembly'], queryFn: () => api.districts('assembly') });
  const sen = useQuery({ queryKey: ['districts', state, 'senate'], queryFn: () => api.districts('senate') });
  const active = layer === 'assembly' ? asm.data : sen.data;

  const onPick = (lng: number, lat: number) => {
    const findIn = (fc?: DistrictCollection) =>
      fc?.features.find((f) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return booleanPointInPolygon([lng, lat], f as any);
        } catch {
          return false;
        }
      });
    setPicked({ assembly: findIn(asm.data), senate: findIn(sen.data) });
  };

  const selectedNum =
    layer === 'assembly' ? picked?.assembly?.properties.district : picked?.senate?.properties.district;

  const style = React.useCallback(
    (feature?: { properties?: DistrictFeature['properties'] }) => {
      const props = feature?.properties;
      const selected = props?.district === selectedNum;
      return {
        color: selected ? '#0f172a' : '#ffffff',
        weight: selected ? 2.5 : 0.7,
        fillColor: partyColor(props?.party),
        fillOpacity: selected ? 0.75 : 0.45,
      };
    },
    [selectedNum],
  );

  // react-leaflet's GeoJSON layer is immutable, so re-style the existing polygons
  // imperatively on selection instead of remounting the whole layer (O(1) vs O(features)).
  React.useEffect(() => {
    geoRef.current?.setStyle(style);
  }, [style]);

  return (
    <div>
      <PageHeader
        title="District Map"
        subtitle={`Click anywhere in ${sl.name} to see its ${sl.lowerLabel} member and State Senator.`}
      >
        <div className="inline-flex rounded-md border bg-card p-1 text-sm">
          {(['assembly', 'senate'] as Chamber[]).map((c) => (
            <button
              key={c}
              onClick={() => setLayer(c)}
              className={cn(
                'rounded px-3 py-1.5 font-medium capitalize transition-colors',
                layer === c ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative isolate h-[55vh] overflow-hidden rounded-lg border bg-card md:h-[72vh]">
          <MapContainer key={sl.name} center={sl.mapCenter} zoom={sl.mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {active ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <GeoJSON ref={geoRef} key={layer} data={active as any} style={style as any} />
            ) : null}
            <ClickProbe onPick={onPick} />
          </MapContainer>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: partyColor('D') }} /> Democratic
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: partyColor('R') }} /> Republican
            </span>
          </div>

          {!picked ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Click the map to identify the district and its representatives.
            </div>
          ) : (
            <>
              <RepCard label="State Senator" feature={picked.senate} />
              <RepCard label="Assemblymember" feature={picked.assembly} />
            </>
          )}

          {(asm.isLoading || sen.isLoading) && (
            <p className="text-center text-xs text-muted-foreground">Loading district boundaries…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RepCard({ label, feature }: { label: string; feature?: DistrictFeature }) {
  if (!feature) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-muted-foreground">No district at this point.</div>
      </div>
    );
  }
  const p = feature.properties;
  const inner = (
    <div className="flex items-center gap-3">
      <MemberAvatar name={p.member ?? '—'} photoUrl={p.photoUrl} party={p.party} size={44} />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label} · District {p.district}
        </div>
        <div className="truncate font-medium">{p.member ?? '(Vacant)'}</div>
        <div className="mt-1">
          <PartyBadge party={p.party} />
        </div>
      </div>
    </div>
  );
  return p.legislatorId ? (
    <Link to={`/legislators/${p.legislatorId}`} className="block rounded-lg border p-4 transition-colors hover:bg-accent/40">
      {inner}
    </Link>
  ) : (
    <div className="rounded-lg border p-4">{inner}</div>
  );
}
