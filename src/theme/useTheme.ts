import { useColorScheme } from 'react-native';

import { colors, darkColors } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? darkColors : colors;

  return {
    scheme: scheme ?? 'light',
    colors: palette,
  };
}
