import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Portal from './src/app/Portal';
import { ThemeProvider } from './src/theme/ThemeContext';
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Portal />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
