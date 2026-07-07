import type { Restaurant, StreetId } from '../types';
import type { Street } from '../types';

interface StreetWithCount extends Street {
  count: number;
}

interface RestaurantListProps {
  restaurants: Restaurant[];
  allRestaurants: Restaurant[];
  streets: StreetWithCount[];
  activeRestaurantId: string | null;
  selectedStreet: StreetId | 'all';
  onSelectStreet: (street: StreetId | 'all') => void;
  onRestaurantClick: (id: string) => void;
}

// ===== 筛选胶囊样式 =====
function pillStyle(isSelected: boolean, accentColor: string): React.CSSProperties {
  return {
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: 500,
    border: isSelected ? '1px solid transparent' : '1px solid #EBE7E0',
    borderRadius: '20px',
    cursor: 'pointer',
    background: isSelected ? accentColor : 'transparent',
    color: isSelected ? '#FFFFFF' : '#8B8578',
    boxShadow: isSelected ? '0 1px 4px rgba(45,42,36,0.06)' : 'none',
    transition: 'all 0.25s ease-out',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
  };
}

function RestaurantList({
  allRestaurants,
  streets,
  activeRestaurantId,
  selectedStreet,
  onSelectStreet,
  onRestaurantClick,
}: RestaurantListProps) {
  // 展示全部店铺，未选中街道的卡片降低透明度
  const displayRestaurants = allRestaurants;

  return (
    <>
      {/* ===== 街道筛选胶囊 ===== */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '16px 20px',
          background: '#FDFBF7',
          borderBottom: '1px solid #EBE7E0',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => onSelectStreet('all')}
          style={pillStyle(selectedStreet === 'all', '#8BA888')}
        >
          全部 ({allRestaurants.length})
        </button>

        {streets.map((street) => (
          <button
            key={street.id}
            onClick={() => onSelectStreet(street.id)}
            style={pillStyle(selectedStreet === street.id, street.color)}
          >
            {street.name} ({street.count})
          </button>
        ))}
      </div>

      {/* ===== 店铺卡片列表 ===== */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
        }}
      >
        {displayRestaurants.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#B5AFA0',
              padding: '60px 20px',
              fontSize: '15px',
            }}
          >
            暂无推荐店铺
          </div>
        ) : (
          displayRestaurants.map((restaurant) => {
            const street = streets.find((s) => s.id === restaurant.streetId);
            const isActive = restaurant.id === activeRestaurantId;
            const isDimmed =
              selectedStreet !== 'all' && restaurant.streetId !== selectedStreet;
            const accent = street?.color ?? '#8BA888';

            return (
              <div
                key={restaurant.id}
                onClick={() => onRestaurantClick(restaurant.id)}
                style={{
                  padding: '20px 20px 20px 26px',
                  marginBottom: '10px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: isActive
                    ? `1px solid ${accent}`
                    : '1px solid #EBE7E0',
                  boxShadow: isActive
                    ? '0 4px 24px rgba(45,42,36,0.10)'
                    : '0 1px 4px rgba(45,42,36,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease-out',
                  position: 'relative',
                  opacity: isDimmed ? 0.3 : 1,
                  transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#DDD8CF';
                    e.currentTarget.style.boxShadow =
                      '0 4px 16px rgba(45,42,36,0.10)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#EBE7E0';
                    e.currentTarget.style.boxShadow =
                      '0 1px 4px rgba(45,42,36,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* 左侧街道色条 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 16,
                    bottom: 16,
                    width: '4px',
                    background: isDimmed ? '#E0DBD0' : accent,
                    borderRadius: '0 3px 3px 0',
                    transition: 'background 0.25s ease-out',
                  }}
                />

                {/* 店名行 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 600,
                      color: isDimmed ? '#C4BFB5' : '#2D2A24',
                      letterSpacing: '0.01em',
                      transition: 'color 0.25s ease-out',
                    }}
                  >
                    {restaurant.name}
                  </h3>
                </div>

                {/* 菜系 · 人均 */}
                <div
                  style={{
                    fontSize: '14px',
                    color: isDimmed ? '#CDC8BD' : '#8B8578',
                    marginBottom: '8px',
                    transition: 'color 0.25s ease-out',
                  }}
                >
                  {street?.name ?? ''} · {restaurant.cuisine}
                  {' · '}
                  {restaurant.avgPrice > 0 ? `人均 ¥${restaurant.avgPrice}` : '人均 暂无'}
                </div>

                {/* 招牌菜 */}
                <div
                  style={{
                    fontSize: '15px',
                    color: isDimmed ? '#C5BFB5' : '#6B6560',
                    marginBottom: '8px',
                    transition: 'color 0.25s ease-out',
                  }}
                >
                  🍽️ {restaurant.signatureDish}
                </div>

                {/* 描述（最多2行） */}
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '13px',
                    color: isDimmed ? '#C5BFB5' : '#8B8578',
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    transition: 'color 0.25s ease-out',
                  }}
                >
                  {restaurant.description}
                </p>

                {/* 标签 */}
                {restaurant.tags && restaurant.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {restaurant.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          background: isDimmed ? '#EDE9E0' : '#F5F2ED',
                          borderRadius: '8px',
                          color: isDimmed ? '#C5BFB5' : '#8B8578',
                          transition: 'all 0.25s ease-out',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default RestaurantList;
