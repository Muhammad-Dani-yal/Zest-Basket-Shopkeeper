import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const FONT = Platform.OS === 'android' ? 'ZestSans' : 'Roboto';
export const THEME_KEY = '@zestbasket/appearance/v1';
export const lightColors = {
  purple: '#58447B',
  primary: '#6D28A8',
  deep: '#202633',
  text: '#202633',
  muted: '#626E80',
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  border: '#E1E5EB',
  tint: '#EEEAF4',
  orange: '#B85C1F',
  green: '#226849',
  red: '#AC3650',
  successSurface: '#E9F4EE',
  dangerSurface: '#FBECEF',
  warningSurface: '#FFF2DC',
  hero: ['#6D28A8', '#AA2C91', '#B85C1F'],
  onPrimary: '#FFFFFF',
  overlay: '#14102688',
  shadow: '#101828',
};
export const darkColors = {
  purple: '#D6C4EE',
  primary: '#8061AA',
  deep: '#F0F2F6',
  text: '#F0F2F6',
  muted: '#BAC3D1',
  bg: '#12151B',
  surface: '#1C212B',
  elevated: '#252C38',
  border: '#343D4B',
  tint: '#352B45',
  orange: '#F1B77E',
  green: '#A7DEC0',
  red: '#F2AABB',
  successSurface: '#1D352C',
  dangerSurface: '#402730',
  warningSurface: '#3C3124',
  hero: ['#412352', '#713361', '#7E492C'],
  onPrimary: '#FFFFFF',
  overlay: '#000000B3',
  shadow: '#000000',
};
const noop = async () => {};
const ThemeContext = createContext({
  dark: false,
  preference: 'system',
  colors: lightColors,
  ready: true,
  setPreference: noop,
});
export function ThemeProvider({ children }) {
  const system = useColorScheme(),
    [preference, setState] = useState('system'),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_KEY)
      .then(v => {
        if (mounted && ['light', 'dark', 'system'].includes(v)) setState(v);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const setPreference = useCallback(async value => {
    if (!['light', 'dark', 'system'].includes(value))
      throw new Error('Choose Light, Dark or System.');
    await AsyncStorage.setItem(THEME_KEY, value);
    setState(value);
  }, []);
  const dark =
    preference === 'system' ? system === 'dark' : preference === 'dark';
  const value = useMemo(
    () => ({
      dark,
      preference,
      ready,
      setPreference,
      colors: dark ? darkColors : lightColors,
    }),
    [dark, preference, ready, setPreference],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function fontStyle(weight = 500) {
  return { fontFamily: FONT, fontWeight: String(weight) };
}
