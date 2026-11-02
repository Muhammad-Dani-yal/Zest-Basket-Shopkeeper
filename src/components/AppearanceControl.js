import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sun, Moon, Monitor } from './icons';
import { FONT, useTheme } from '../theme/ThemeContext';
export function AppearanceControl({ onError = () => {} }) {
  const { colors, preference, setPreference } = useTheme();
  return (
    <View
      style={{
        padding: 17,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontFamily: FONT,
          fontSize: 16,
          fontWeight: '700',
          color: colors.text,
        }}
      >
        Appearance
      </Text>
      <Text
        style={{
          fontFamily: FONT,
          fontSize: 13,
          lineHeight: 20,
          color: colors.muted,
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        Choose a look that feels right. Your choice is saved.
      </Text>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        {[
          ['light', 'Light', Sun],
          ['dark', 'Dark', Moon],
          ['system', 'System', Monitor],
        ].map(([mode, title, Icon]) => (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`Use ${title} theme`}
            accessibilityState={{ selected: preference === mode }}
            onPress={() => setPreference(mode).catch(onError)}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 8,
              paddingVertical: 15,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: preference === mode ? colors.primary : colors.border,
              backgroundColor: preference === mode ? colors.tint : colors.bg,
            }}
          >
            <Icon
              size={21}
              strokeWidth={1.8}
              color={preference === mode ? colors.purple : colors.muted}
            />
            <Text
              style={{
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: '600',
                color: preference === mode ? colors.purple : colors.muted,
              }}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function ThemeToggle({ onError = () => {}, onBrand = false }) {
  const { dark, colors, setPreference } = useTheme(),
    Icon = dark ? Sun : Moon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onPress={() => setPreference(dark ? 'light' : 'dark').catch(onError)}
      style={{
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: onBrand ? '#FFFFFF18' : colors.tint,
      }}
    >
      <Icon
        color={onBrand ? 'white' : colors.purple}
        size={21}
        strokeWidth={1.8}
      />
    </Pressable>
  );
}
