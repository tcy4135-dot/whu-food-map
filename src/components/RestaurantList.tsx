import type { Restaurant, StreetId } from '../types';
import type { Street } from '../types';

interface StreetWithCount extends Street {
  count: number;
}

interface RestaurantListProps {
  restaurants: Restaurant[];
  streets: StreetWithCount[];
  activeRestaurantId: string | null;
  selectedStreet: StreetId | 'all';
  onSelectStreet: (street: StreetId | 'all') => void;
  onRestaurantClick: (id: string) => void;
}

function RestaurantList({
  restaurants,
  streets,
  activeRestaurantId,
  selectedStreet,
  onSelectStreet,
  onRestaurantClick,
}: RestaurantListProps) {
  return (
    <>
      {/* 街道筛选 Tab */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          flexShrink: 0,
        }}
      >
        {/* "全部" 按钮 */}
        <button
          onClick={() => onSelectStreet('all')}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: selectedStreet === 'all' ? 600 : 400,
            background: selectedStreet === 'all' ? '#333' : '#f0f0f0',
            color: selectedStreet === 'all' ? '#fff' : '#555',
            transition: 'all 0.2s',
          }}
        >
          全部 ({restaurants.length})
        </button>

        {/* 各街道按钮 */}
        {streets.map((street) => (
          <button
            key={street.id}
            onClick={() => onSelectStreet(street.id)}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: selectedStreet === street.id ? 600 : 400,
              background: selectedStreet === street.id ? street.color : '#f0f0f0',
              color: selectedStreet === street.id ? '#fff' : '#555',
              transition: 'all 0.2s',
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
          padding: '16px',
        }}
      >
        {restaurants.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              padding: '60px 20px',
              fontSize: '15px',
            }}
          >
            🍽️ 该街道暂无推荐店铺
          </div>
        ) : (
          restaurants.map((restaurant) => {
            const street = streets.find((s) => s.id === restaurant.streetId);
            const isActive = restaurant.id === activeRestaurantId;

            return (
              <div
                key={restaurant.id}
                onClick={() => onRestaurantClick(restaurant.id)}
                style={{
                  padding: '16px',
                  marginBottom: '10px',
                  background: isActive ? '#fff' : '#fff',
                  borderRadius: '12px',
                  border: isActive
                    ? `2px solid ${street?.color ?? '#333'}`
                    : '1px solid #eee',
                  boxShadow: isActive
                    ? '0 4px 16px rgba(0,0,0,0.1)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#ccc';
                    e.currentTarget.style.boxShadow =
                      '0 2px 8px rgba(0,0,0,0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#eee';
                    e.currentTarget.style.boxShadow =
                      '0 1px 4px rgba(0,0,0,0.04)';
                  }
                }}
              >
                {/* 左侧颜色条 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 12,
                    bottom: 12,
                    width: '4px',
                    background: street?.color ?? '#ccc',
                    borderRadius: '0 2px 2px 0',
                  }}
                />

                {/* 标题行 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    paddingLeft: '6px',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1a1a1a',
                    }}
                  >
                    {restaurant.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#e74c3c',
                    }}
                  >
                    ¥{restaurant.avgPrice}
                  </span>
                </div>

                {/* 街道 + 菜系 */}
                <div
                  style={{
                    fontSize: '12px',
                    color: '#888',
                    marginBottom: '6px',
                    paddingLeft: '6px',
                  }}
                >
                  📍 {street?.name ?? ''} · {restaurant.cuisine}
                </div>

                {/* 招牌菜 */}
                <div
                  style={{
                    fontSize: '13px',
                    color: '#555',
                    marginBottom: '8px',
                    paddingLeft: '6px',
                  }}
                >
                  🍽️ 招牌：{restaurant.signatureDish}
                </div>

                {/* 描述 */}
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: '1.5',
                    paddingLeft: '6px',
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
                      paddingLeft: '6px',
                    }}
                  >
                    {restaurant.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#f5f5f5',
                          borderRadius: '10px',
                          color: '#888',
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
