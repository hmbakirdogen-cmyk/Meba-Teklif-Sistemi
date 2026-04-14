/**
 * useColors — tema-duyarlı renk paleti.
 * Tüm bileşenler bu hook'u kullanarak inline stillerini tema değerine göre alır.
 *
 * Renk paletleri artık design-system/theme.ts'de tanımlıdır.
 * Bu hook yalnızca useTheme bağlamından isDark değerini okur ve
 * doğru paleti döndürür.
 */
import { useMemo } from 'react';
import { useTheme } from '../context/useTheme';
import { lightTheme, darkTheme } from '../design-system/theme';

export type { ThemeColors as Colors } from '../design-system/theme';

export function useColors() {
  const { isDark } = useTheme();
  return useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);
}
