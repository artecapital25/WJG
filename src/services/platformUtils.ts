// Servicio y utilidades para detección de plataformas 3D y enlaces de modelos de internet

export interface InfoPlataforma3D {
  name: string;
  color: string;
  bg: string;
  borderColor: string;
  icon: string;
}

export function detect3DPlatform(url: string = ''): InfoPlataforma3D {
  const lower = (url || '').toLowerCase();

  if (lower.includes('cults3d') || lower.includes('cults')) {
    return {
      name: 'Cults3D',
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.15)',
      borderColor: 'rgba(236, 72, 153, 0.35)',
      icon: '🎨'
    };
  }

  if (lower.includes('cgtrader')) {
    return {
      name: 'CGTrader',
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.15)',
      borderColor: 'rgba(6, 182, 212, 0.35)',
      icon: '💎'
    };
  }

  if (lower.includes('thingiverse')) {
    return {
      name: 'Thingiverse',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.15)',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      icon: '🌀'
    };
  }

  if (lower.includes('makerworld')) {
    return {
      name: 'MakerWorld',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.35)',
      icon: '🚀'
    };
  }

  if (lower.includes('printables')) {
    return {
      name: 'Printables',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.15)',
      borderColor: 'rgba(249, 115, 22, 0.35)',
      icon: '🟠'
    };
  }

  if (lower.includes('myminifactory')) {
    return {
      name: 'MyMiniFactory',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      icon: '🏰'
    };
  }

  if (lower.includes('gambody')) {
    return {
      name: 'Gambody',
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.15)',
      borderColor: 'rgba(234, 179, 8, 0.35)',
      icon: '⭐'
    };
  }

  if (lower.includes('patreon')) {
    return {
      name: 'Patreon',
      color: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.15)',
      borderColor: 'rgba(244, 63, 94, 0.35)',
      icon: '❤️'
    };
  }

  if (lower.includes('thangs')) {
    return {
      name: 'Thangs',
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgba(99, 102, 241, 0.35)',
      icon: '📐'
    };
  }

  if (lower.includes('drive.google') || lower.includes('dropbox') || lower.includes('mega.nz')) {
    return {
      name: 'Cloud Drive',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.15)',
      borderColor: 'rgba(168, 85, 247, 0.35)',
      icon: '☁️'
    };
  }

  return {
    name: 'Web 3D',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    icon: '🌐'
  };
}

export function formatExternalUrl(url: string = ''): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export interface QuickSearchPlatform {
  name: string;
  url: string;
  icon: string;
  color: string;
}

export function getQuickSearchUrls(term: string = ''): QuickSearchPlatform[] {
  const q = encodeURIComponent((term || 'figura 3d').trim());
  return [
    {
      name: 'Cults3D',
      url: `https://cults3d.com/es/busqueda?q=${q}`,
      icon: '🎨',
      color: '#ec4899'
    },
    {
      name: 'CGTrader',
      url: `https://www.cgtrader.com/3d-models?keywords=${q}`,
      icon: '💎',
      color: '#06b6d4'
    },
    {
      name: 'Thingiverse',
      url: `https://www.thingiverse.com/search?q=${q}`,
      icon: '🌀',
      color: '#3b82f6'
    },
    {
      name: 'MakerWorld',
      url: `https://makerworld.com/es/search/models?keyword=${q}`,
      icon: '🚀',
      color: '#10b981'
    },
    {
      name: 'Printables',
      url: `https://www.printables.com/search/models?q=${q}`,
      icon: '🟠',
      color: '#f97316'
    }
  ];
}
