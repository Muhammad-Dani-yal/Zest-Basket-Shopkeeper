jest.mock('@react-native-async-storage/async-storage', () => {
  const entries = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => entries.get(key) || null),
      setItem: jest.fn(async (key, value) => {
        entries.set(key, value);
      }),
      clear: jest.fn(async () => entries.clear()),
    },
  };
});
jest.mock('react-native-linear-gradient', () => require('react-native').View);
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(View, null, children),
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('../src/components/icons', () => {
  const React = require('react'),
    { View } = require('react-native');
  const Icon = props => React.createElement(View, props);
  return Object.fromEntries(
    [
      'Wheat',
      'Croissant',
      'Layers',
      'Moon',
      'Sun',
      'Monitor',
      'Sparkles',
      'ArrowUpRight',
      'Award',
      'AlertTriangle',
      'ChevronDown',
      'Home',
      'ShoppingBag',
      'Package',
      'Settings',
      'Bell',
      'Menu',
      'ArrowLeft',
      'X',
      'Store',
      'Wallet',
      'ChartColumn',
      'History',
      'ShieldCheck',
      'Headphones',
      'User',
      'LogOut',
      'Plus',
      'Pencil',
      'Trash2',
      'Camera',
      'Clock',
      'Truck',
      'Phone',
      'CheckCircle2',
      'Download',
      'Search',
      'ShoppingBasket',
      'Leaf',
      'Eye',
      'EyeOff',
      'PackageOpen',
      'WifiOff',
      'ChevronRight',
      'Check',
    ].map(name => [name, Icon]),
  );
});
jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(async () => ({ filePath: '/cache/receipt.pdf' })),
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({ success: true })) },
}));
