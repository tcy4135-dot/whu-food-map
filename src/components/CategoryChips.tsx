import type { CuisineCategory } from '../types';

// 菜系 → 图标映射
const CUISINE_ICONS: Record<string, string> = {
  甜品饮品: '🧋',
  咖啡: '☕',
  中餐: '🥢',
  火锅: '🍲',
  快餐: '🍔',
  小吃: '🍢',
  面食: '🍜',
  韩料: '🇰🇷',
  烧烤: '🔥',
  日料: '🍣',
  西餐: '🍝',
};

interface CategoryChipsProps {
  selected: string | 'all';
  onSelect: (cuisine: string | 'all') => void;
  cuisines: string[];
}

export default function CategoryChips({ selected, onSelect, cuisines }: CategoryChipsProps) {
  return (
    <section style={{ padding: '0 24px 20px' }}>
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {/* "全部" chip */}
        <button
          onClick={() => onSelect('all')}
          style={{
            padding: '10px 22px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'inherit',
            border: selected === 'all' ? '1px solid transparent' : '1px solid #EBE7E0',
            borderRadius: '24px',
            cursor: 'pointer',
            background: selected === 'all' ? '#8BA888' : 'transparent',
            color: selected === 'all' ? '#FFFFFF' : '#8B8578',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.2s ease-out',
          }}
        >
          全部
        </button>

        {/* 各菜系 chip */}
        {cuisines.map((cuisine) => (
          <button
            key={cuisine}
            onClick={() => onSelect(cuisine)}
            style={{
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'inherit',
              border: selected === cuisine ? '1px solid transparent' : '1px solid #EBE7E0',
              borderRadius: '24px',
              cursor: 'pointer',
              background: selected === cuisine ? '#8BA888' : 'transparent',
              color: selected === cuisine ? '#FFFFFF' : '#8B8578',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s ease-out',
            }}
          >
            {CUISINE_ICONS[cuisine] ?? ''} {cuisine}
          </button>
        ))}
      </div>
    </section>
  );
}
