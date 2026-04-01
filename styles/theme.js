export const lightColors = {
  primary: '#FF6B35',
  primaryLight: '#FFF0E8',
  secondary: '#2EC4B6',
  background: '#FAFAFA',
  card: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const darkColors = {
  primary: '#FF6B35',
  primaryLight: '#2A1A10',
  secondary: '#2EC4B6',
  background: '#0F0F14',
  card: '#1A1A24',
  textPrimary: '#F0F0F5',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A2A35',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

// Default export for backward compatibility - will be overridden by ThemeContext
export const colors = lightColors;

// Typography without colors - colors are applied inline via useSettings() for dark mode support
export const getTypography = (themeColors) => ({
  headingXL: { fontSize: 28, fontWeight: '700', color: themeColors.textPrimary },
  headingL: { fontSize: 22, fontWeight: '700', color: themeColors.textPrimary },
  headingM: { fontSize: 18, fontWeight: '600', color: themeColors.textPrimary },
  body: { fontSize: 16, fontWeight: '400', color: themeColors.textPrimary },
  bodySmall: { fontSize: 14, fontWeight: '400', color: themeColors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: themeColors.textMuted },
  button: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

// Static typography WITHOUT color - safe for StyleSheet.create()
export const typography = {
  headingXL: { fontSize: 28, fontWeight: '700' },
  headingL: { fontSize: 22, fontWeight: '700' },
  headingM: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
  button: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
