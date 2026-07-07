import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Restaurant, StreetId } from '../types';
import { streets } from '../data/streets';
import 'leaflet/dist/leaflet.css';

// ===== 毛玻璃发光的圆形标记 (12px) =====
function createGlowIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.85);
        border-radius: 50%;
        box-shadow:
          0 0 0 4px ${color}33,
          0 0 0 8px ${color}18,
          0 2px 8px rgba(45,42,36,0.15);
        cursor: pointer;
        transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });
}

const streetIcons: Record<string, L.DivIcon> = {};
streets.forEach((s) => {
  streetIcons[s.id] = createGlowIcon(s.color);
});

function getIcon(streetId: string): L.DivIcon {
  return streetIcons[streetId] ?? streetIcons['guangbalu'];
}

// ===== 飞行动画 =====
function FlyToRestaurant({ restaurant }: { restaurant: Restaurant | null }) {
  const map = useMap();
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (restaurant && restaurant.id !== prevIdRef.current) {
      map.flyTo(restaurant.latLng, 17, { duration: 0.8 });
      prevIdRef.current = restaurant.id;
    }
  }, [restaurant, map]);

  return null;
}

// ===== 重置视野 =====
function ResetViewControl() {
  const map = useMap();

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '64px' }}>
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={() => map.flyTo([30.535, 114.360], 14, { duration: 0.8 })}
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            border: '1px solid var(--border-light)',
            background: '#FFFFFF',
            borderRadius: '10px',
            boxShadow: '0 1px 4px rgba(45,42,36,0.06)',
            fontFamily: 'inherit',
            color: '#8B8578',
            fontWeight: 500,
            transition: 'all 0.2s ease-out',
          }}
          title="重置视野"
        >
          回全景
        </button>
      </div>
    </div>
  );
}

// ===== Popup 样式 =====
const S = {
  container: {
    minWidth: '220px',
    fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  } as React.CSSProperties,
  title: {
    margin: '0 0 6px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#2D2A24',
    letterSpacing: '0.01em',
  } as React.CSSProperties,
  meta: {
    fontSize: '12px',
    color: '#8B8578',
    marginBottom: '3px',
  } as React.CSSProperties,
  price: {
    fontSize: '13px',
    color: '#CBA48B',
    fontWeight: 600,
    marginBottom: '8px',
  } as React.CSSProperties,
  desc: {
    margin: '0',
    fontSize: '13px',
    color: '#6B6560',
    lineHeight: '1.6',
  } as React.CSSProperties,
  tagsWrap: {
    marginTop: '8px',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  tag: {
    fontSize: '10px',
    padding: '3px 10px',
    background: '#F5F2ED',
    borderRadius: '8px',
    color: '#8B8578',
  } as React.CSSProperties,
};

// ===== Props =====
interface MapViewProps {
  restaurants: Restaurant[];
  selectedStreet: StreetId | 'all';
  activeRestaurantId: string | null;
  onMarkerClick: (id: string) => void;
  onPopupClose: () => void;
}

// ===== 主组件 =====
function MapView({
  restaurants,
  selectedStreet,
  activeRestaurantId,
  onMarkerClick,
  onPopupClose,
}: MapViewProps) {
  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId) ?? null;

  return (
    <MapContainer
      center={[30.535, 114.360]}
      zoom={14}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {restaurants.map((restaurant) => {
        const isDimmed =
          selectedStreet !== 'all' && restaurant.streetId !== selectedStreet;

        return (
          <Marker
            key={restaurant.id}
            position={restaurant.latLng}
            icon={getIcon(restaurant.streetId)}
            opacity={isDimmed ? 0.25 : 1}
            eventHandlers={{ click: () => onMarkerClick(restaurant.id) }}
          >
            <Popup eventHandlers={{ remove: onPopupClose }}>
              <div style={S.container}>
                <h3 style={S.title}>{restaurant.name}</h3>
                <div style={S.meta}>
                  {streets.find((s) => s.id === restaurant.streetId)?.name} · {restaurant.cuisine}
                </div>
                <div style={S.meta}>🍽️ 招牌：{restaurant.signatureDish}</div>
                <div style={S.price}>
                  💰 {restaurant.avgPrice > 0 ? `人均 ¥${restaurant.avgPrice}` : '人均 暂无'}
                </div>
                <p style={S.desc}>{restaurant.description}</p>
                {restaurant.tags && restaurant.tags.length > 0 && (
                  <div style={S.tagsWrap}>
                    {restaurant.tags.map((tag) => (
                      <span key={tag} style={S.tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      <FlyToRestaurant restaurant={activeRestaurant} />
      <ResetViewControl />
    </MapContainer>
  );
}

export default MapView;
