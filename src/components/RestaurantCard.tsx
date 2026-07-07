import type { Restaurant } from '../types';
import { streets } from '../data/streets';

// 菜系 → 图片占位渐变
function cuisineGradient(cuisine: string): string {
  const map: Record<string, string> = {
    中餐: 'linear-gradient(135deg, #D4A574 0%, #C4885A 50%, #A6704A 100%)',
    火锅: 'linear-gradient(135deg, #D4745A 0%, #C44A3A 50%, #A63020 100%)',
    快餐: 'linear-gradient(135deg, #C4A882 0%, #B8956A 50%, #A07850 100%)',
    小吃: 'linear-gradient(135deg, #D4B896 0%, #C4A070 50%, #A88860 100%)',
    甜品饮品: 'linear-gradient(135deg, #D4C4B0 0%, #C4B098 50%, #A89880 100%)',
    面食: 'linear-gradient(135deg, #C4B898 0%, #B4A480 50%, #988C68 100%)',
    韩料: 'linear-gradient(135deg, #C4A0A0 0%, #B48888 50%, #987070 100%)',
    烧烤: 'linear-gradient(135deg, #B89870 0%, #A07850 50%, #886040 100%)',
  };
  return map[cuisine] ?? 'linear-gradient(135deg, #B8A898 0%, #A89880 50%, #908070 100%)';
}

// 模拟评分（基于 ID hash）
function mockRating(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  const base = Math.abs(hash % 15) + 35; // 3.5–5.0
  return base / 10;
}

interface Props {
  restaurant: Restaurant;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: (id: string) => void;
}

export default function RestaurantCard({ restaurant, isFavorited, onToggleFavorite, onClick }: Props) {
  const street = streets.find((s) => s.id === restaurant.streetId);
  const rating = mockRating(restaurant.id);

  return (
    <div
      onClick={() => onClick(restaurant.id)}
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid #EBE7E0',
        boxShadow: '0 1px 4px rgba(45,42,36,0.04)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(45,42,36,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(45,42,36,0.04)';
      }}
    >
      {/* 图片占位区 */}
      <div
        style={{
          height: '120px',
          background: cuisineGradient(restaurant.cuisine),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          position: 'relative',
        }}
      >
        <span style={{ opacity: 0.5 }}>🍽️</span>

        {/* 右上角收藏按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(restaurant.id);
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: isFavorited ? '#E8D1D1' : 'rgba(255,255,255,0.85)',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-out',
            backdropFilter: 'blur(4px)',
          }}
        >
          {isFavorited ? '❤️' : '🤍'}
        </button>

        {/* 右下角价格 */}
        <span
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            background: 'rgba(255,255,255,0.92)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#CBA48B',
            backdropFilter: 'blur(4px)',
          }}
        >
          {restaurant.avgPrice > 0 ? `¥${restaurant.avgPrice}` : '暂无'}
        </span>
      </div>

      {/* 文字内容 */}
      <div style={{ padding: '16px' }}>
        {/* 标题行：店名 + 评分 */}
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
              fontSize: '18px',
              fontWeight: 600,
              color: '#2D2A24',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              marginRight: '8px',
            }}
          >
            {restaurant.name}
          </h3>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#CBA48B',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ⭐ {rating.toFixed(1)}
          </span>
        </div>

        {/* 位置 · 菜系 */}
        <div style={{ fontSize: '13px', color: '#8B8578', marginBottom: '8px' }}>
          📍 {street?.name ?? ''} · {restaurant.cuisine}
        </div>

        {/* 推荐语（一行截断） */}
        <p
          style={{
            fontSize: '14px',
            color: '#6B6560',
            margin: '0 0 10px',
            lineHeight: '1.5',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {restaurant.description}
        </p>

        {/* 标签 */}
        {restaurant.tags && restaurant.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {restaurant.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  background: '#F0EDE6',
                  borderRadius: '8px',
                  color: '#8B8578',
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
