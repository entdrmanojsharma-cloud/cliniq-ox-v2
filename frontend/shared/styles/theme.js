/* 
  Purpose: Define shared UI Theme Constants.
  Responsibility: Provide color tokens, typography sizes, and standard styling definitions utilizing CSS variables.
*/

export const theme = {
  colors: {
    primary: 'var(--primary, #6366f1)',
    primaryLight: 'var(--primary-light, #a5b4fc)',
    background: 'var(--background, #0f172a)',
    surface: 'var(--surface, #1e293b)',
    border: 'var(--border, #334155)',
    text: 'var(--text, #f8fafc)',
    textMuted: 'var(--text-muted, #cbd5e1)',
    success: 'var(--success, #34d399)',
    warning: 'var(--warning, #f59e0b)',
    danger: 'var(--danger, #ef4444)',
    accent: 'var(--accent, #ec4899)'
  },
  typography: {
    title: { fontSize: 24, fontWeight: '700', color: 'var(--text, #f8fafc)' },
    subtitle: { fontSize: 16, fontWeight: '600', color: 'var(--text-muted, #cbd5e1)' },
    body: { fontSize: 14, color: 'var(--text, #f8fafc)' },
    caption: { fontSize: 12, color: 'var(--text-muted, #cbd5e1)' }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }
};
