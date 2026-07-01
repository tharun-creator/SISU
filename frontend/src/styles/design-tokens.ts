export const tokens = {
  colors: {
    primary: '#4F46E5',       // Indigo
    primaryHover: '#4338CA',
    primaryLight: '#EEF2FF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    surfaceTertiary: '#F1F5F9',
    text: {
      primary: '#0F172A',     // Slate-900
      secondary: '#64748B',   // Slate-500
      disabled: '#94A3B8',    // Slate-400
      inverse: '#FFFFFF',
    },
    border: '#E2E8F0',        // Slate-200
    borderFocus: '#4F46E5',
  },
  fonts: {
    heading: 'Geist, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  spacing: {
    xs: '4px',   // 0.25rem
    sm: '8px',   // 0.5rem
    md: '16px',  // 1rem
    lg: '24px',  // 1.5rem
    xl: '32px',  // 2rem
    '2xl': '48px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    card: '0 1px 3px rgba(0,0,0,0.05)',
    dropdown: '0 4px 12px rgba(0,0,0,0.08)',
    modal: '0 20px 60px rgba(0,0,0,0.15)',
  },
  animation: {
    fast: '150ms ease-out',
    normal: '200ms ease-out',
    slow: '300ms ease-out',
  },
};
export type DesignTokens = typeof tokens;
