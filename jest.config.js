module.exports = {
  preset: '@react-native/jest-preset',
  testTimeout: 60000,
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest' },
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-safe-area-context)/)',
  ],
};
