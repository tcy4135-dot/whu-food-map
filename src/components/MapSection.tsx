import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Restaurant, StreetId } from '../types';
import { streets } from '../data/streets';
import 'leaflet/dist/leaflet.css';

// ===== 毛玻璃发光圆形标记 =====
function createGlowIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:12px;height:12px;
      background:${color};
      border:2px solid rgba(255,255,255,0.85);
      border-radius:50%;
      box-shadow:0 0 0 4px ${color}33,0 0 0 8px ${color}18,0 2px 8px rgba(45,42,36,0.12);
      cursor:pointer;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });
}

const streetIcons: Record<string, L.DivIcon> = {};
streets.forEach((s) => { streetIcons[s.id] = createGlowIcon(s.color); });
function getIcon(sid: string) { return streetIcons[sid] ?? streetIcons['guangbalu']; }

function FlyTo({ r }: { r: Restaurant | null }) {
  const map = useMap();
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (r && r.id !== prev.current) { map.flyTo(r.latLng, 17, { duration: 0.8 }); prev.current = r.id; }
  }, [r, map]);
  return null;
}

interface Props {
  restaurants: Restaurant[];
  selectedStreet: StreetId | 'all';
  activeId: string | null;
  onMarkerClick: (id: string) => void;
  onPopupClose: () => void;
}

export default function MapSection({ restaurants, selectedStreet, activeId, onMarkerClick, onPopupClose }: Props) {
  const [expanded, setExpanded] = useState(false);
  const active = restaurants.find((r) => r.id === activeId) ?? null;
  const height = expanded ? '60vh' : '280px';

  return (
    <section style={{ padding: '0 24px 32px' }}>
      <div
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(45,42,36,0.04)',
          border: '1px solid #EBE7E0',
          height,
          transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
        }}
      >
        <MapContainer center={[30.535, 114.360]} zoom={14} scrollWheelZoom={!expanded} style={{ width: '100%', height: '100%' }}>
          <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {restaurants.map((r) => {
            const dimmed = selectedStreet !== 'all' && r.streetId !== selectedStreet;
            return (
              <Marker key={r.id} position={r.latLng} icon={getIcon(r.streetId)} opacity={dimmed ? 0.2 : 1}
                eventHandlers={{ click: () => onMarkerClick(r.id) }}>
                <Popup eventHandlers={{ remove: onPopupClose }}>
                  <div style={{ minWidth: '200px', fontFamily: 'inherit' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#2D2A24' }}>{r.name}</h3>
                    <div style={{ fontSize: '12px', color: '#8B8578', marginBottom: '2px' }}>
                      {streets.find((s) => s.id === r.streetId)?.name} · {r.cuisine}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8B8578', marginBottom: '6px' }}>🍽️ {r.signatureDish}</div>
                    <div style={{ fontSize: '13px', color: '#CBA48B', fontWeight: 600, marginBottom: '6px' }}>
                      {r.avgPrice > 0 ? `💰 人均 ¥${r.avgPrice}` : '💰 人均 暂无'}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6B6560', lineHeight: 1.5 }}>{r.description}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <FlyTo r={active} />
        </MapContainer>

        {/* 展开/收起按钮 */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'inherit',
            border: '1px solid #EBE7E0',
            borderRadius: '20px',
            background: '#FFFFFF',
            color: '#8B8578',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(45,42,36,0.06)',
            transition: 'all 0.2s ease-out',
          }}
        >
          {expanded ? '收起地图' : '🗺️ 查看完整地图'}
        </button>
      </div>
    </section>
  );
}
