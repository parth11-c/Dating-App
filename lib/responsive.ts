import { Platform, PixelRatio, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const fontSizes = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
};

export function responsiveValue<T extends number>(phone: T, large: T): T {
  // Simple breakpoint: treat width >= 400 as large
  return (width >= 400 ? large : phone) as T;
}

export const shadows = {
  none: {},
  small: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    default: {
      elevation: 2,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    default: {
      elevation: 4,
    },
  }),
};

export const buttonDimensions = {
  height: 44,
  paddingHorizontal: 16,
  borderRadius: 12,
};
