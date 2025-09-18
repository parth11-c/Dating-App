import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isSmallDevice = width < 360;
export const isTablet = Math.min(width, height) >= 768;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  display: 34,
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

export const responsiveValue = (small: number, large: number) => {
  if (isTablet) return large;
  if (isSmallDevice) return Math.round(small * 0.9);
  return small;
};

export const responsivePadding = {
  horizontal: responsiveValue(16, 32),
  vertical: responsiveValue(16, 32),
};

export const buttonDimensions = {
  height: responsiveValue(48, 56),
  paddingHorizontal: responsiveValue(18, 22),
  borderRadius: responsiveValue(12, 16),
};

export const shadows = {
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
};
