/* 
  Purpose: Define shared UI Theme Constants.
  Responsibility: Provide color tokens, typography sizes, and standard styling definitions utilizing CSS variables.
*/

export const theme = {
  colors: {
    primary: 'var(--primary, #4f46e5)',
    primaryLight: 'var(--primary-light, #818cf8)',
    background: 'var(--background, #f8fafc)',
    surface: 'var(--surface, #ffffff)',
    border: 'var(--border, #e2e8f0)',
    text: 'var(--text, #0f172a)',
    textMuted: 'var(--text-muted, #64748b)',
    success: 'var(--success, #10b981)',
    warning: 'var(--warning, #f59e0b)',
    danger: 'var(--danger, #ef4444)',
    accent: 'var(--accent, #ec4899)'
  },
  typography: {
    title: { fontSize: 24, fontWeight: '700', color: 'var(--text, #0f172a)' },
    subtitle: { fontSize: 16, fontWeight: '600', color: 'var(--text-muted, #64748b)' },
    body: { fontSize: 14, color: 'var(--text, #0f172a)' },
    caption: { fontSize: 12, color: 'var(--text-muted, #64748b)' }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  }
};
