import { useState, useEffect, useRef } from 'react';

interface HeroSectionProps {
  onSearch: (keyword: string) => void;
  totalCount: number;
}

export default function HeroSection({ onSearch, totalCount }: HeroSectionProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(value.trim()), 200);
    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  return (
    <section
      style={{
        textAlign: 'center',
        padding: '64px 24px 40px',
        background: 'linear-gradient(180deg, #F7F4EF 0%, #F0EDE6 100%)',
      }}
    >
      <h1
        style={{
          fontFamily: "'Ma Shan Zheng', 'ZCOOL XiaoWei', '华文行楷', cursive",
          fontSize: 'clamp(32px, 5vw, 42px)',
          fontWeight: 400,
          color: '#2D2A24',
          letterSpacing: '0.06em',
          marginBottom: '12px',
          lineHeight: 1.2,
        }}
      >
        今天吃什么？
      </h1>

      <p
        style={{
          fontSize: '16px',
          color: '#8B8578',
          marginBottom: '28px',
          letterSpacing: '0.02em',
          fontWeight: 400,
        }}
      >
        探索武大周边 {totalCount} 家美食店铺
      </p>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: '520px',
          margin: '0 auto',
          background: '#FFFFFF',
          borderRadius: '28px',
          border: '1px solid #EBE7E0',
          boxShadow: '0 2px 12px rgba(45,42,36,0.05)',
          padding: '12px 20px',
          gap: '10px',
          transition: 'box-shadow 0.2s ease-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(45,42,36,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(45,42,36,0.05)';
        }}
      >
        <span style={{ fontSize: '18px', flexShrink: 0 }}>🔍</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索店名或招牌菜..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '16px',
            fontFamily: 'inherit',
            color: '#2D2A24',
            background: 'transparent',
          }}
        />
        {value && (
          <button
            onClick={() => setValue('')}
            style={{
              border: 'none',
              background: '#F0EDE6',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8B8578',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </section>
  );
}
