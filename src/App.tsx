import { useState, useCallback, useMemo, useEffect } from 'react';
import HeroSection from './components/HeroSection';
import CategoryChips from './components/CategoryChips';
import FeaturedCards from './components/FeaturedCards';
import MapSection from './components/MapSection';
import RestaurantCard from './components/RestaurantCard';
import { restaurants } from './data/restaurants';
import { streets } from './data/streets';
import type { StreetId } from './types';
import './App.css';

// 收藏持久化
function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem('whu-food-fav');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveFavorites(set: Set<string>) {
  localStorage.setItem('whu-food-fav', JSON.stringify([...set]));
}

function App() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<StreetId | 'all'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | 'all'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  // 刷新页面时滚动到顶部
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // 收藏切换
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  // 提取菜系列表
  const cuisineList = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.cuisine));
    return [...set].sort();
  }, []);

  // 多条件筛选
  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (selectedStreet !== 'all' && r.streetId !== selectedStreet) return false;
      if (selectedCuisine !== 'all' && r.cuisine !== selectedCuisine) return false;
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        return (
          r.name.toLowerCase().includes(kw) ||
          r.signatureDish.toLowerCase().includes(kw) ||
          r.description.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [selectedStreet, selectedCuisine, searchKeyword]);

  // 收藏排前面
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aFav = favorites.has(a.id) ? -1 : 0;
      const bFav = favorites.has(b.id) ? -1 : 0;
      return aFav - bFav;
    });
  }, [filtered, favorites]);

  const handleCardClick = useCallback((id: string) => {
    setActiveId(id);
    // 地图区域滚动到视野
    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleMarkerClick = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  return (
    <div className="app-container">
      {/* 极简导航 */}
      <nav className="app-nav">
        <span className="nav-logo">🍜 武大美食地图</span>
      </nav>

      <div className="app-main">
        {/* Hero + 搜索 */}
        <HeroSection onSearch={setSearchKeyword} totalCount={restaurants.length} />

        {/* 菜系分类芯片 */}
        <CategoryChips
          selected={selectedCuisine}
          onSelect={(c) => setSelectedCuisine(c)}
          cuisines={cuisineList}
        />

        {/* 精选推荐（仅在无筛选时显示） */}
        {selectedStreet === 'all' && selectedCuisine === 'all' && !searchKeyword && (
          <FeaturedCards restaurants={restaurants} onCardClick={handleCardClick} />
        )}

        {/* 地图区域 */}
        <div id="map-section">
          <h2 className="section-title" style={{ padding: '0 24px' }}>
            🗺️ 周边美食地图
          </h2>
          <MapSection
            restaurants={restaurants}
            selectedStreet={selectedStreet}
            activeId={activeId}
            onMarkerClick={handleMarkerClick}
            onPopupClose={() => setActiveId(null)}
          />
        </div>

        {/* 全部店铺卡片 */}
        <h2 className="section-title" style={{ padding: '0 24px' }}>
          🍜 {searchKeyword || selectedCuisine !== 'all' ? '搜索结果' : '全部店铺'}
          <span style={{ fontSize: '14px', fontWeight: 400, color: '#B5AFA0', marginLeft: '8px' }}>
            {sorted.length} 家
          </span>
        </h2>

        <div className="card-grid">
          {sorted.length === 0 ? (
            <div className="empty-state">😔 没有找到匹配的店铺，试试其他关键词吧</div>
          ) : (
            sorted.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                isFavorited={favorites.has(r.id)}
                onToggleFavorite={toggleFavorite}
                onClick={handleCardClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
