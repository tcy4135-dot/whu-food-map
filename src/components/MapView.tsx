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

// ===== 自定义 Marker 图标（按街道颜色） =====
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid #fff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

// 预生成每个街道的图标
const streetIcons: Record<string, L.DivIcon> = {};
streets.forEach((s) => {
  streetIcons[s.id] = createColoredIcon(s.color);
});

function getIcon(streetId: string): L.DivIcon {
  return streetIcons[streetId] ?? streetIcons['guangbalu'];
}

// ===== 地图飞行动画子组件 =====
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

// ===== 重置地图视野按钮 =====
function ResetViewControl() {
  const map = useMap();

  const handleReset = () => {
    map.flyTo([30.535, 114.360], 14, { duration: 0.8 });
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '60px' }}>
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={handleReset}
          style={{
            padding: '8px 14px',
            fontSize: '14px',
            cursor: 'pointer',
            border: 'none',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(180, 140, 150, 0.15)',
            fontFamily: 'inherit',
            color: '#e8708b',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          title="重置视野"
        >
          🏠 全景
        </button>
      </div>
    </div>
  );
}

// ===== 主组件 Props =====
interface MapViewProps {
  restaurants: Restaurant[];
  selectedStreet: StreetId | 'all';
  activeRestaurantId: string | null;
  onMarkerClick: (id: string) => void;
  onPopupClose: () => void;
}

// ===== 地图主组件 =====
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
      {/* 底图 */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 店铺标记 — 根据筛选调整透明度 */}
      {restaurants.map((restaurant) => {
        const isDimmed =
          selectedStreet !== 'all' && restaurant.streetId !== selectedStreet;

        return (
          <Marker
            key={restaurant.id}
            position={restaurant.latLng}
            icon={getIcon(restaurant.streetId)}
            opacity={isDimmed ? 0.3 : 1}
            eventHandlers={{
              click: () => onMarkerClick(restaurant.id),
            }}
          >
            <Popup
              eventHandlers={{
                remove: onPopupClose,
              }}
            >
              <div style={{ minWidth: '210px', fontFamily: 'inherit' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#3d2c33' }}>
                  {restaurant.name}
                </h3>
                <div style={{ fontSize: '13px', color: '#8c6e7a', marginBottom: '4px' }}>
                  📍 {streets.find((s) => s.id === restaurant.streetId)?.name} · {restaurant.cuisine}
                </div>
                <div style={{ fontSize: '13px', color: '#8c6e7a', marginBottom: '4px' }}>
                  🍽️ 招牌：{restaurant.signatureDish}
                </div>
                <div style={{ fontSize: '13px', color: '#e8708b', fontWeight: 600, marginBottom: '8px' }}>
                  💰 人均 ¥{restaurant.avgPrice}
                </div>
                <p style={{ margin: '0', fontSize: '13px', color: '#5c4a52', lineHeight: '1.6' }}>
                  {restaurant.description}
                </p>
                {restaurant.tags && restaurant.tags.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {restaurant.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#fff5f7',
                          borderRadius: '10px',
                          color: '#c97a8e',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* 飞行定位 + 重置按钮 */}
      <FlyToRestaurant restaurant={activeRestaurant} />
      <ResetViewControl />
    </MapContainer>
  );
}

export default MapView;
