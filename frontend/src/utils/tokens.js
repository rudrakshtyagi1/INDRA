/**
 * FLOODLAB COMMAND CENTER DESIGN TOKENS
 * Unified operational palette, typography, spacing, and transition constants.
 */

export const TOKENS = {
  colors: {
    bgBase: '#020617', // slate-950
    bgSurface: '#090d16', // operational charcoal
    bgPanel: '#0f172a', // slate-900
    bgCard: '#1e293b', // slate-800
    
    cyanAccent: '#06b6d4', // cyan-500
    cyanLight: '#38bdf8', // sky-400
    cyanGlow: 'rgba(6, 182, 212, 0.25)',
    
    dangerRed: '#ef4444', // red-500
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    dangerBorder: 'rgba(239, 68, 68, 0.4)',
    
    warningAmber: '#f59e0b', // amber-500
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningBorder: 'rgba(245, 158, 11, 0.4)',
    
    safeGreen: '#10b981', // emerald-500
    safeBg: 'rgba(16, 185, 129, 0.15)',
    safeBorder: 'rgba(16, 185, 129, 0.4)',
    
    purpleAccent: '#c084fc', // purple-400
    purpleBg: 'rgba(192, 132, 252, 0.15)',
    
    textPrimary: '#f8fafc', // slate-50
    textSecondary: '#cbd5e1', // slate-300
    textMuted: '#94a3b8', // slate-400
    textDim: '#64748b', // slate-500
    
    borderSubtle: 'rgba(51, 65, 85, 0.7)',
    borderActive: 'rgba(6, 182, 212, 0.5)',
  },
  radii: {
    card: '1rem',
    button: '0.75rem',
    badge: '9999px',
  },
  transitions: {
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
  },
};
