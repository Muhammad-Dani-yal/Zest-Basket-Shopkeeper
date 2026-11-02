import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Home, ShoppingBag, Package, Settings } from './icons';
import { FONT, useTheme } from '../theme/ThemeContext';
const tabs = [
  [Home, 'Home', 'dashboard'],
  [ShoppingBag, 'Orders', 'orders'],
  [Package, 'Inventory', 'inventory'],
  [Settings, 'Settings', 'settings'],
];
export default function BottomNavigation({ route, onNavigate }) {
  const { colors } = useTheme(),
    { fontScale } = useWindowDimensions();
  return (
    <View style={[styles.dock, { backgroundColor: colors.bg }]}>
      <View
        accessibilityRole="tablist"
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            minHeight: 76 + Math.max(0, fontScale - 1) * 18,
          },
        ]}
      >
        {tabs.map(([Icon, label, name]) => {
          const active =
            route.name === name ||
            (name === 'orders' &&
              ['order', 'packing', 'rider', 'receipt', 'preparation'].includes(
                route.name,
              )) ||
            (name === 'inventory' &&
              ['product', 'history'].includes(route.name));
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => onNavigate(name)}
              style={({ pressed }) => [
                styles.item,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: active ? colors.tint : 'transparent' },
                ]}
              >
                <Icon
                  size={23}
                  strokeWidth={active ? 2.2 : 1.8}
                  color={active ? colors.purple : colors.muted}
                  fill={active ? colors.purple + '12' : 'none'}
                />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: active ? colors.purple : colors.muted,
                    fontWeight: active ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  dock: { paddingTop: 8, paddingHorizontal: 14, paddingBottom: 10 },
  bar: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 0.09,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  item: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 16,
  },
  iconWrap: {
    width: 49,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: FONT, fontSize: 12, lineHeight: 18 },
});
