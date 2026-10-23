import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface AccessDeniedViewProps {
  requiredArea: string;
  operatorName: string;
  onGoBack?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  requiredArea,
  operatorName,
  onGoBack
}) => {
  return (
    <div style={{
      maxWidth: '520px',
      margin: '60px auto',
      padding: '32px 24px',
      borderRadius: '20px',
      background: 'rgba(15, 23, 42, 0.85)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      backdropFilter: 'blur(16px)',
      textAlign: 'center',
      color: '#f8fafc',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px auto',
        color: '#f87171'
      }}>
        <Lock size={30} />
      </div>

      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px 0', color: '#f87171' }}>
        Acceso Restringido por Rol (RBAC)
      </h2>

      <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '16px' }}>
        El operador actual (<strong style={{ color: '#38bdf8' }}>{operatorName}</strong>) no tiene privilegios asignados para acceder al módulo de <strong style={{ textTransform: 'uppercase', color: '#f87171' }}>{requiredArea}</strong>.
      </p>

      <div style={{
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '10px',
        fontSize: '0.78rem',
        color: '#94a3b8',
        marginBottom: '20px'
      }}>
        💡 Para solicitar habilitación de este módulo, contacta al administrador general (Germán).
      </div>

      {onGoBack && (
        <button
          type="button"
          onClick={onGoBack}
          className="btn btn-primary"
          style={{
            margin: '0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontWeight: 700
          }}
        >
          <ArrowLeft size={16} /> Volver al Taller
        </button>
      )}
    </div>
  );
};
