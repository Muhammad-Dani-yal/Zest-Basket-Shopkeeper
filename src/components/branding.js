import React, { useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Package, ShoppingBag, ArrowUpRight } from './icons';
import { FONT, useTheme } from '../theme/ThemeContext';
const mascot = require('../assets/shopkeeper-mascot.png'),
  riderImage = require('../assets/rider-avatar.png'),
  brandIcon = require('../assets/shopkeeper-icon.png');
const BText = ({ style, ...props }) => (
  <Text {...props} style={[{ fontFamily: FONT }, style]} />
);
export function Avatar({ size = 46, rider = false, style }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      accessibilityLabel={rider ? 'Rider avatar' : 'Shopkeeper avatar'}
      colors={rider ? ['#324D80', '#6981A1'] : colors.hero}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.35,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: '#FFFFFF90',
        },
        style,
      ]}
    >
      <Image
        source={rider ? riderImage : mascot}
        resizeMode="contain"
        resizeMethod="resize"
        style={
          rider
            ? { width: size, height: size }
            : {
                position: 'absolute',
                width: size * 1.9,
                height: size * 2.85,
                left: -size * 0.46,
                top: -size * 0.18,
              }
        }
      />
    </LinearGradient>
  );
}
export function Logo({ compact = false, light = false }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: compact ? 'flex-start' : 'center',
        flexDirection: compact ? 'row' : 'column',
        gap: compact ? 11 : 10,
        paddingVertical: compact ? 0 : 18,
      }}
    >
      <Image
        source={brandIcon}
        accessibilityLabel="ZestBasket Shopkeeper brand icon"
        resizeMode="contain"
        style={{
          width: compact ? 44 : 68,
          height: compact ? 44 : 68,
          borderRadius: compact ? 13 : 19,
        }}
      />
      <View style={{ alignItems: compact ? 'flex-start' : 'center' }}>
        <BText
          style={{
            fontSize: compact ? 25 : 30,
            lineHeight: 37,
            fontWeight: '800',
            letterSpacing: -0.7,
            color: light ? 'white' : colors.text,
          }}
        >
          ZestBasket
        </BText>
        <BText
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 2.3,
            lineHeight: 19,
            color: light ? '#FFF0DE' : colors.purple,
          }}
        >
          SHOPKEEPER
        </BText>
        {!compact && (
          <BText
            style={{
              fontSize: 12,
              color: light ? '#FFF1E6' : colors.muted,
              marginTop: 6,
            }}
          >
            Fresh Groceries, Happier Homes
          </BText>
        )}
      </View>
    </View>
  );
}
export function Hero({ welcome = false, onInventory, onOrders }) {
  const { colors } = useTheme(),
    { width } = useWindowDimensions(),
    styles = useMemo(() => makeStyles(colors), [colors]);
  if (welcome)
    return (
      <LinearGradient
        colors={colors.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.welcome,
          { height: Math.min(520, Math.max(455, width * 1.2)) },
        ]}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 25 }}>
          <Logo compact light />
        </View>
        <View style={{ position: 'absolute', top: 118, left: 24, right: 20 }}>
          <BText style={styles.welcomeTitle}>Welcome,{'\n'}Shopkeeper!</BText>
        </View>
        <BText style={styles.welcomeDescription}>
          Manage your shop, inventory and orders — all in one place.
        </BText>
        <Image
          accessibilityLabel="Shopkeeper with fresh groceries"
          source={mascot}
          resizeMode="contain"
          resizeMethod="resize"
          style={{
            position: 'absolute',
            right: -8,
            bottom: -2,
            width: '68%',
            height: '66%',
          }}
        />
      </LinearGradient>
    );
  return (
    <LinearGradient
      colors={colors.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.55 }}
      style={styles.dashboardHero}
    >
      <View style={styles.glow} />
      <BText style={styles.eyebrow}>YOUR SHOPKEEPER DESK</BText>
      <Image
        accessibilityLabel="Friendly ZestBasket shopkeeper"
        source={mascot}
        resizeMode="contain"
        resizeMethod="resize"
        style={styles.dashboardMascot}
      />
      <View style={styles.bubble}>
        <BText style={styles.bubbleTitle}>
          Bhai, aaj kaunsa order tayyar karna hai?
        </BText>
        <BText style={styles.bubbleDescription}>Main sab dekh leta hoon!</BText>
      </View>
      <View style={styles.shortcuts}>
        {[
          [Package, 'Inventory', onInventory],
          [ShoppingBag, 'Watch Orders', onOrders],
        ].map(([Icon, label, onPress]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={
              label === 'Inventory' ? 'Inventory shortcut' : 'Orders shortcut'
            }
            onPress={onPress}
            style={({ pressed }) => [
              styles.shortcut,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon size={20} color="white" strokeWidth={1.8} />
            <BText style={styles.shortcutText}>{label}</BText>
            <ArrowUpRight color="#FFFFFFA6" size={16} />
          </Pressable>
        ))}
      </View>
    </LinearGradient>
  );
}
export function ShopkeeperSplash() {
  const { colors } = useTheme(),
    { width, height } = useWindowDimensions();
  return (
    <LinearGradient
      testID="brand-splash"
      accessibilityLabel="ZestBasket Shopkeeper splash screen"
      colors={colors.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Logo light />
      <Image
        accessibilityLabel="ZestBasket shopkeeper splash avatar"
        source={mascot}
        resizeMode="contain"
        resizeMethod="resize"
        style={{
          width: Math.min(width - 56, 310),
          height: Math.min(height * 0.47, 420),
          marginVertical: 16,
        }}
      />
      <View
        style={{
          backgroundColor: '#FFFFFF1C',
          borderWidth: 1,
          borderColor: '#FFFFFF38',
          paddingHorizontal: 17,
          paddingVertical: 9,
          borderRadius: 20,
        }}
      >
        <BText
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.3,
            color: 'white',
          }}
        >
          YOUR SHOP. YOUR SUCCESS.
        </BText>
      </View>
      <BText
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: 'white',
          marginTop: 18,
        }}
      >
        Manage. Grow. Succeed.
      </BText>
      <ActivityIndicator color="white" style={{ marginTop: 24 }} />
      <BText style={{ fontSize: 13, color: '#FFF0E4', marginTop: 10 }}>
        Getting your shop ready…
      </BText>
    </LinearGradient>
  );
}
const makeStyles = C =>
  StyleSheet.create({
    welcome: { width: '100%', overflow: 'hidden' },
    welcomeTitle: {
      color: 'white',
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 41,
      letterSpacing: -0.7,
    },
    welcomeDescription: {
      position: 'absolute',
      top: 223,
      left: 24,
      width: '38%',
      color: '#FFF3E8',
      fontSize: 14,
      lineHeight: 23,
      fontWeight: '500',
    },
    dashboardHero: { minHeight: 276, borderRadius: 22, overflow: 'hidden' },
    glow: {
      position: 'absolute',
      width: 230,
      height: 230,
      borderRadius: 115,
      backgroundColor: '#FFFFFF0C',
      left: -30,
      bottom: -40,
    },
    eyebrow: {
      color: '#FFFFFFC9',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.3,
      position: 'absolute',
      top: 18,
      left: 18,
    },
    dashboardMascot: {
      position: 'absolute',
      left: -8,
      bottom: -5,
      width: '46%',
      height: 247,
    },
    bubble: {
      position: 'absolute',
      top: 18,
      right: 15,
      width: '51%',
      backgroundColor: C.surface,
      padding: 14,
      borderRadius: 15,
      borderBottomLeftRadius: 4,
    },
    bubbleTitle: {
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 21,
      color: C.text,
    },
    bubbleDescription: {
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
      color: C.muted,
    },
    shortcuts: {
      position: 'absolute',
      bottom: 16,
      right: 15,
      width: '51%',
      gap: 9,
    },
    shortcut: {
      minHeight: 45,
      borderRadius: 12,
      backgroundColor: '#FFFFFF18',
      borderWidth: 1,
      borderColor: '#FFFFFF32',
      flexDirection: 'row',
      gap: 9,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    shortcutText: { fontSize: 13, fontWeight: '600', color: 'white', flex: 1 },
  });
