import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, THEME_KEY } from '../src/theme/ThemeContext';

test('appearance persists across remounts and failed saves retain the current theme', async () => {
  await AsyncStorage.clear();
  let value, tree;
  function Probe() {
    value = useTheme();
    return null;
  }
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  await act(async () => {
    await value.setPreference('dark');
  });
  expect(value.dark).toBe(true);
  expect(await AsyncStorage.getItem(THEME_KEY)).toBe('dark');
  await act(async () => tree.unmount());
  await act(async () => {
    tree = Renderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  expect(value.dark).toBe(true);
  AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage unavailable'));
  await act(async () => {
    await expect(value.setPreference('light')).rejects.toThrow(
      'Storage unavailable',
    );
  });
  expect(value.dark).toBe(true);
  await act(async () => {
    await value.setPreference('light');
  });
  expect(value.dark).toBe(false);
  await act(async () => tree.unmount());
});
