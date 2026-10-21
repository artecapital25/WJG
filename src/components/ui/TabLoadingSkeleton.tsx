import React from 'react';

export const TabLoadingSkeleton: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Barra superior skeleton */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          width: '240px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(56,189,248,0.12) 50%, rgba(255,255,255,0.04) 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite'
        }} />
        <div style={{
          width: '120px',
          height: '36px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.05)'
        }} />
      </div>

      {/* Grid de tarjetas skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[1, 2, 3, 4].map(idx => (
          <div
            key={idx}
            style={{
              height: '140px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{
              width: '60%',
              height: '20px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)'
            }} />
            <div style={{
              width: '90%',
              height: '14px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.03)'
            }} />
            <div style={{
              width: '40%',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.1)'
            }} />
          </div>
        ))}
      </div>

      {/* Contenedor principal skeleton */}
      <div style={{
        height: '340px',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(56, 189, 248, 0.2)',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Cargando módulo...
        </span>
      </div>

      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
