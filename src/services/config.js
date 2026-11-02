import { Platform } from 'react-native';
export const config = {
  mode: 'mock',
  baseURL:
    Platform.OS === 'android'
      ? 'http://10.0.2.2:4100/api'
      : 'http://localhost:4100/api',
  timeout: 15000,
};
