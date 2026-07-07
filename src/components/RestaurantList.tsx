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

function RestaurantList({
  allRestaurants,
  streets,
  activeRestaurantId,
  selectedStreet,
  onSelectStreet,
  onRestaurantClick,
}: RestaurantListProps) {
  // 展示全部店铺，未选中街道的卡片变暗
  const displayRestaurants = allRestaurants;

  return (
    <>
      {/* 街道筛选 Tab */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '14px 16px',
          background: 'linear-gradient(180deg, #ffffff 0%, #fffafb 100%)',
          borderBottom: '1px solid #f0e0e5',
          flexShrink: 0,
        }}
      >
        {/* "全部" 按钮 */}
        <button
          onClick={() => onSelectStreet('all')}
          style={{
            padding: '7px 16px',
            fontSize: '13px',
            border: selectedStreet === 'all' ? '2px solid #e8708b' : '2px solid transparent',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: selectedStreet === 'all' ? 600 : 400,
            background: selectedStreet === 'all'
              ? 'linear-gradient(135deg, #fda4ba, #f85a7a)'
              : '#f8f0f2',
            color: selectedStreet === 'all' ? '#fff' : '#8c6e7a',
            boxShadow: selectedStreet === 'all'
              ? '0 2px 8px rgba(248, 90, 122, 0.3)'
              : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
          }}
        >
          🌸 全部 ({allRestaurants.length})
        </button>

        {/* 各街道按钮 */}
        {streets.map((street) => (
          <button
            key={street.id}
            onClick={() => onSelectStreet(street.id)}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              border: selectedStreet === street.id
                ? `2px solid ${street.color}`
                : '2px solid transparent',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: selectedStreet === street.id ? 600 : 400,
              background: selectedStreet === street.id
                ? street.color
                : '#f8f0f2',
              color: selectedStreet === street.id ? '#fff' : '#8c6e7a',
              boxShadow: selectedStreet === street.id
                ? `0 2px 8px ${street.color}40`
                : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap',
            }}
          >
            {street.name} ({street.count})
          </button>
        ))}
      </div>

      {/* 店铺列表 */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
        }}
      >
        {displayRestaurants.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#c9a8b2',
              padding: '60px 20px',
              fontSize: '15px',
            }}
          >
            🍽️ 暂无推荐店铺
          </div>
        ) : (
          displayRestaurants.map((restaurant) => {
            const street = streets.find((s) => s.id === restaurant.streetId);
            const isActive = restaurant.id === activeRestaurantId;
            const isDimmed =
              selectedStreet !== 'all' && restaurant.streetId !== selectedStreet;

            return (
              <div
                key={restaurant.id}
                onClick={() => onRestaurantClick(restaurant.id)}
                style={{
                  padding: '16px 16px 16px 22px',
                  marginBottom: '10px',
                  background: isActive ? '#fff' : '#fff',
                  borderRadius: '14px',
                  border: isActive
                    ? `2px solid ${street?.color ?? '#e8708b'}`
                    : '1px solid #f0e0e5',
                  boxShadow: isActive
                    ? '0 4px 20px rgba(180, 140, 150, 0.15)'
                    : '0 1px 4px rgba(180, 140, 150, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  opacity: isDimmed ? 0.35 : 1,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#f0c8d4';
                    e.currentTarget.style.boxShadow =
                      '0 4px 16px rgba(180, 140, 150, 0.1)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#f0e0e5';
                    e.currentTarget.style.boxShadow =
                      '0 1px 4px rgba(180, 140, 150, 0.05)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {/* 左侧颜色条 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 14,
                    bottom: 14,
                    width: '4px',
                    background: isDimmed
                      ? '#e0d0d5'
                      : street?.color ?? '#e8708b',
                    borderRadius: '0 3px 3px 0',
                    transition: 'background 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />

                {/* 标题行 */}
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
                      fontSize: '16px',
                      fontWeight: 600,
                      color: isDimmed ? '#c4b0b8' : '#3d2c33',
                      transition: 'color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {restaurant.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: isDimmed ? '#d4c0c8' : '#e8708b',
                      transition: 'color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    ¥{restaurant.avgPrice}
                  </span>
                </div>

                {/* 街道 + 菜系 */}
                <div
                  style={{
                    fontSize: '12px',
                    color: isDimmed ? '#cebec5' : '#b8a0aa',
                    marginBottom: '6px',
                    transition: 'color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  📍 {street?.name ?? ''} · {restaurant.cuisine}
                </div>

                {/* 招牌菜 */}
                <div
                  style={{
                    fontSize: '13px',
                    color: isDimmed ? '#c8b8bf' : '#8c6e7a',
                    marginBottom: '8px',
                    transition: 'color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  🍽️ 招牌：{restaurant.signatureDish}
                </div>

                {/* 描述 */}
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '13px',
                    color: isDimmed ? '#c8b8bf' : '#6b565e',
                    lineHeight: '1.6',
                    transition: 'color 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {restaurant.description}
                </p>

                {/* 标签 */}
                {restaurant.tags && restaurant.tags.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {restaurant.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          background: isDimmed ? '#f3eeef' : '#fff0f3',
                          borderRadius: '12px',
                          color: isDimmed ? '#c9bcc2' : '#d48a9c',
                          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
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
