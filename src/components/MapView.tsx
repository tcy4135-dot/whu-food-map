import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Restaurant } from '../types';
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
            padding: '6px 12px',
            fontSize: '14px',
            cursor: 'pointer',
            border: 'none',
            background: '#fff',
            borderRadius: '4px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
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
  activeRestaurantId: string | null;
  onMarkerClick: (id: string) => void;
  onPopupClose: () => void;
}

// ===== 地图主组件 =====
function MapView({ restaurants, activeRestaurantId, onMarkerClick, onPopupClose }: MapViewProps) {
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

      {/* 店铺标记 */}
      {restaurants.map((restaurant) => (
        <Marker
          key={restaurant.id}
          position={restaurant.latLng}
          icon={getIcon(restaurant.streetId)}
          eventHandlers={{
            click: () => onMarkerClick(restaurant.id),
          }}
        >
          <Popup
            eventHandlers={{
              remove: onPopupClose,
            }}
          >
            <div style={{ minWidth: '200px', fontFamily: 'inherit' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>
                {restaurant.name}
              </h3>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                📍 {streets.find((s) => s.id === restaurant.streetId)?.name} · {restaurant.cuisine}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                🍽️ 招牌：{restaurant.signatureDish}
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                💰 人均 ¥{restaurant.avgPrice}
              </div>
              <p style={{ margin: '0', fontSize: '13px', color: '#444', lineHeight: '1.5' }}>
                {restaurant.description}
              </p>
              {restaurant.tags && restaurant.tags.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {restaurant.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        background: '#f0f0f0',
                        borderRadius: '4px',
                        color: '#666',
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
      ))}

      {/* 飞行定位 + 重置按钮 */}
      <FlyToRestaurant restaurant={activeRestaurant} />
      <ResetViewControl />
    </MapContainer>
  );
}

export default MapView;
