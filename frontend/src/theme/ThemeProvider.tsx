import { PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { useAppStore } from '../utils/store';
import { darkColors, lightColors, ThemeColors } from './theme';

const ThemeContext = createContext<ThemeColors>(darkColors);

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useAppStore((state) => state.theme);
  const value = useMemo(
    () => (theme === 'light' ? lightColors : darkColors),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
