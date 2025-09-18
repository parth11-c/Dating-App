import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/theme/ThemeContext';

export type AppTheme = typeof Colors.light & { mode: 'light' | 'dark' };

export function useThemeColors(): AppTheme {
  const { effective } = useAppTheme();
  const mode: 'light' | 'dark' = effective;
  return { ...Colors[mode], mode } as AppTheme;
}
