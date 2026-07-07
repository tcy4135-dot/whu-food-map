import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import RestaurantList from './components/RestaurantList';
import { restaurants } from './data/restaurants';
import { streets } from './data/streets';
import type { StreetId } from './types';
import './App.css';

function App() {
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<StreetId | 'all'>('all');

  const filteredRestaurants =
    selectedStreet === 'all'
      ? restaurants
      : restaurants.filter((r) => r.streetId === selectedStreet);

  const activeRestaurant = restaurants.find((r) => r.id === activeRestaurantId) ?? null;

  const handleRestaurantClick = useCallback((id: string) => {
    setActiveRestaurantId(id);
  }, []);

  const handleMarkerClick = useCallback((id: string) => {
    setActiveRestaurantId(id);
  }, []);

  const handlePopupClose = useCallback(() => {
    setActiveRestaurantId(null);
  }, []);

  const streetCounts = streets.map((s) => ({
    ...s,
    count: restaurants.filter((r) => r.streetId === s.id).length,
  }));

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="app-header">
        <div className="logo">
          <span className="icon">🍜</span>
          <span>武大美食地图</span>
        </div>
        <div className="street-summary">
          {streets.length} 条美食街 · {restaurants.length} 家推荐店铺
        </div>
      </header>

      {/* 主体：地图 + 列表 */}
      <div className="app-body">
        <div className="map-wrapper">
          <MapView
            restaurants={filteredRestaurants}
            activeRestaurantId={activeRestaurantId}
            onMarkerClick={handleMarkerClick}
            onPopupClose={handlePopupClose}
          />
        </div>
        <div className="list-wrapper">
          <RestaurantList
            restaurants={filteredRestaurants}
            streets={streetCounts}
            activeRestaurantId={activeRestaurantId}
            selectedStreet={selectedStreet}
            onSelectStreet={setSelectedStreet}
            onRestaurantClick={handleRestaurantClick}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
