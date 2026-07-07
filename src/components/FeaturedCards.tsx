import type { Restaurant } from '../types';
import { streets } from '../data/streets';

interface FeaturedCardsProps {
  restaurants: Restaurant[];
  onCardClick: (id: string) => void;
}

// 按菜系生成图片占位渐变
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

export default function FeaturedCards({ restaurants, onCardClick }: FeaturedCardsProps) {
  // 精选：取 tags 含"人气高"或"排队王"或"本地特色"的店铺
  const featured = restaurants.filter((r) =>
    r.tags?.some((t) => ['人气高', '排队王', '本地特色'].includes(t))
  );

  // 若不足 4 个，补充分量足、适合聚餐的
  if (featured.length < 4) {
    const extras = restaurants.filter(
      (r) => !featured.includes(r) && r.tags?.some((t) => ['分量足', '适合聚餐', '环境好'].includes(t))
    );
    featured.push(...extras.slice(0, 4 - featured.length));
  }

  const display = featured.slice(0, 5);

  if (display.length === 0) return null;

  return (
    <section style={{ padding: '0 24px 32px' }}>
      <h2
        style={{
          fontSize: '22px',
          fontWeight: 600,
          color: '#2D2A24',
          marginBottom: '16px',
          letterSpacing: '0.02em',
        }}
      >
        ✨ 精选推荐
      </h2>

      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {display.map((r) => {
          const street = streets.find((s) => s.id === r.streetId);
          return (
            <div
              key={r.id}
              onClick={() => onCardClick(r.id)}
              style={{
                flexShrink: 0,
                width: '260px',
                background: '#FFFFFF',
                borderRadius: '24px',
                overflow: 'hidden',
                cursor: 'pointer',
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
              {/* 渐变占位图 */}
              <div
                style={{
                  height: '150px',
                  background: cuisineGradient(r.cuisine),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  position: 'relative',
                }}
              >
                <span style={{ opacity: 0.6 }}>🍽️</span>
                {/* 价格标签 */}
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
                  }}
                >
                  {r.avgPrice > 0 ? `¥${r.avgPrice}` : '暂无'}
                </span>
              </div>

              {/* 文字区域 */}
              <div style={{ padding: '14px 16px' }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#2D2A24',
                    marginBottom: '6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.name}
                </h3>
                <div style={{ fontSize: '13px', color: '#8B8578', marginBottom: '8px' }}>
                  {street?.name ?? ''} · {r.cuisine}
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#6B6560',
                    lineHeight: '1.5',
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {r.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
