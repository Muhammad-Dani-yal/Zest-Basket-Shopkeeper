import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { config } from '../services/config';
import { FONT, lightColors, useTheme } from '../theme/ThemeContext';
import {
  Eye,
  EyeOff,
  PackageOpen,
  WifiOff,
  ChevronRight,
  Check,
  Package,
  Wheat,
  Croissant,
  Layers,
} from './icons';
export const C = lightColors;
export const money = v => 'Rs. ' + Number(v || 0).toLocaleString('en-PK');
export const date = v =>
  new Date(v).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
export function useUiStyles() {
  const { colors } = useTheme();
  return useMemo(() => createStyles(colors), [colors]);
}
export function Txt({ children, style, ...props }) {
  const { colors } = useTheme(),
    styles = useUiStyles(),
    flat = StyleSheet.flatten(style) || {};
  const size = Math.max(flat.fontSize || 15, 12);
  return (
    <Text
      {...props}
      style={[
        styles.text,
        style,
        {
          fontFamily: FONT,
          fontSize: size,
          lineHeight: Math.max(flat.lineHeight || 23, Math.ceil(size * 1.38)),
          color: flat.color || colors.text,
        },
      ]}
    >
      {children}
    </Text>
  );
}
export function Heading({ children }) {
  const styles = useUiStyles();
  return <Txt style={styles.heading}>{children}</Txt>;
}
export function Row({ children, style }) {
  return <View style={[base.row, style]}>{children}</View>;
}
export function Card({ children, style, onPress }) {
  const styles = useUiStyles();
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && { opacity: 0.86 },
      ]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );
}
export function IconBadge({ icon: Icon, size = 40, color, background }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size * 0.3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background || colors.tint,
      }}
    >
      <Icon
        size={size * 0.5}
        color={color || colors.purple}
        strokeWidth={1.9}
      />
    </View>
  );
}
export function Button({
  children,
  onPress,
  outline,
  danger,
  disabled,
  style,
  icon: Icon,
}) {
  const { colors } = useTheme(),
    styles = useUiStyles();
  const inner = (
    <Row style={{ justifyContent: 'center', gap: 9 }}>
      {Icon && (
        <Icon
          size={19}
          strokeWidth={1.9}
          color={outline ? colors.purple : 'white'}
        />
      )}
      <Txt
        style={{
          fontSize: 15,
          color: outline ? (danger ? colors.red : colors.purple) : 'white',
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {children}
      </Txt>
    </Row>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: disabled ? 0.45 : pressed ? 0.84 : 1, marginVertical: 5 },
        style,
      ]}
    >
      {outline ? (
        <View
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: danger ? colors.red : colors.border,
            },
          ]}
        >
          {inner}
        </View>
      ) : (
        <LinearGradient
          colors={danger ? ['#A82F4C', '#8F2440'] : colors.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  secret,
  error,
  multiline,
  ...props
}) {
  const [show, setShow] = useState(false),
    { colors } = useTheme(),
    styles = useUiStyles();
  return (
    <View style={{ marginBottom: 16 }}>
      <Txt style={styles.label}>{label}</Txt>
      <View style={[styles.inputRow, error && { borderColor: colors.red }]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          selectionColor={colors.purple}
          keyboardAppearance={useTheme().dark ? 'dark' : 'light'}
          value={value === undefined ? '' : String(value)}
          onChangeText={onChangeText}
          secureTextEntry={secret && !show}
          multiline={multiline}
          style={[
            styles.input,
            multiline && { minHeight: 100, textAlignVertical: 'top' },
          ]}
          {...props}
        />
        {secret && (
          <Pressable
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
            onPress={() => setShow(!show)}
            style={{ padding: 12 }}
          >
            {show ? (
              <EyeOff size={20} color={colors.muted} />
            ) : (
              <Eye size={20} color={colors.muted} />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Txt style={{ color: colors.red, fontSize: 12, marginTop: 5 }}>
          {error}
        </Txt>
      )}
    </View>
  );
}
const products = {
  flour: require('../assets/products/flour.png'),
  milk: require('../assets/products/milk.png'),
  bananas: require('../assets/products/bananas.png'),
  tomatoes: require('../assets/products/tomatoes.png'),
};
function artwork(p) {
  const label = (
    (p.id || p.productId || '') +
    ' ' +
    (p.name || '')
  ).toLowerCase();
  return /flour|wheat/.test(label)
    ? products.flour
    : /milk/.test(label)
    ? products.milk
    : /banana/.test(label)
    ? products.bananas
    : /tomato/.test(label)
    ? products.tomatoes
    : /dairy/i.test(p.category || '')
    ? products.milk
    : /fruit/i.test(p.category || '')
    ? products.bananas
    : /vegetable/i.test(p.category || '')
    ? products.tomatoes
    : /grocery/i.test(p.category || '')
    ? products.flour
    : null;
}
export function ProductImage({ product, size = 66 }) {
  const { colors } = useTheme(),
    [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.imageUrl]);
  const local = artwork(product),
    uri = product.imageUrl?.startsWith('/')
      ? config.baseURL.replace(/\/api\/?$/, '') + product.imageUrl
      : product.imageUrl;
  const showRemote = Boolean(uri && !failed);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {local ? (
        <Image
          accessibilityLabel={product.name || 'Product image'}
          source={local}
          resizeMode="contain"
          resizeMethod="resize"
          style={{
            width: size - 8,
            height: size - 8,
          }}
        />
      ) : (
        <Package size={size * 0.44} strokeWidth={1.5} color={colors.purple} />
      )}
      {showRemote && (
        <Image
          accessibilityLabel={`${product.name || 'Product'} uploaded photo`}
          source={{ uri }}
          resizeMode="cover"
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFillObject}
        />
      )}
    </View>
  );
}
const categoryArt = {
  Grocery: products.flour,
  Fruits: products.bananas,
  Vegetables: products.tomatoes,
  Dairy: products.milk,
};
export function CategoryStrip({ values, value, onChange }) {
  const { colors, dark } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingTop: 5, paddingBottom: 17 }}
    >
      {values.map(v => {
        const active = v === value,
          Icon = v === 'Bakery' ? Croissant : v === 'Grocery' ? Wheat : Layers;
        return (
          <Pressable
            key={v}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(v)}
            style={{
              width: 82,
              borderRadius: 17,
              padding: 7,
              alignItems: 'center',
              gap: 4,
              backgroundColor: active ? colors.tint : colors.surface,
              borderWidth: 1.5,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            <LinearGradient
              colors={dark ? ['#30283D', '#252C38'] : ['#F5EFF9', '#F9F4ED']}
              style={{
                height: 48,
                width: 60,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {categoryArt[v] ? (
                <Image
                  source={categoryArt[v]}
                  resizeMode="contain"
                  style={{ width: 51, height: 46 }}
                />
              ) : (
                <Icon size={27} color={colors.purple} strokeWidth={1.6} />
              )}
            </LinearGradient>
            <Txt
              numberOfLines={1}
              style={{
                fontSize: 12,
                fontWeight: active ? '700' : '500',
                color: active ? colors.purple : colors.muted,
              }}
            >
              {v}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
export function Chips({ values, value, onChange }) {
  const { colors } = useTheme();
  if (values.includes('Fruits') && values.includes('Dairy'))
    return <CategoryStrip values={values} value={value} onChange={onChange} />;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
    >
      {values.map(v => (
        <Pressable
          key={v}
          accessibilityRole="tab"
          accessibilityState={{ selected: v === value }}
          onPress={() => onChange(v)}
          style={{
            borderRadius: 13,
            paddingHorizontal: 17,
            paddingVertical: 10,
            backgroundColor: v === value ? colors.primary : colors.surface,
            borderWidth: 1,
            borderColor: v === value ? colors.primary : colors.border,
          }}
        >
          <Txt
            style={{
              fontSize: 13,
              color: v === value ? 'white' : colors.muted,
              fontWeight: '600',
            }}
          >
            {v}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function Pill({ children }) {
  const { colors } = useTheme();
  const good = [
      'Verified',
      'Paid',
      'Delivered',
      'active',
      'Resolved',
      'Handed Over',
      'In Stock',
    ].includes(children),
    bad = ['Rejected', 'Cancelled', 'closed', 'Low Stock'].includes(children);
  return (
    <View
      style={{
        backgroundColor: good
          ? colors.successSurface
          : bad
          ? colors.dangerSurface
          : colors.tint,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9,
        alignSelf: 'flex-start',
      }}
    >
      <Txt
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: good ? colors.green : bad ? colors.red : colors.purple,
        }}
      >
        {children}
      </Txt>
    </View>
  );
}
export function LinkRow({ title, subtitle, onPress, icon: Icon }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {Icon && <IconBadge icon={Icon} />}
      <View style={{ flex: 1 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600' }}>{title}</Txt>
        {subtitle && (
          <Txt style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {subtitle}
          </Txt>
        )}
      </View>
      <ChevronRight color={colors.muted} size={18} strokeWidth={1.6} />
    </Pressable>
  );
}
export { Logo, Hero, Avatar, ShopkeeperSplash } from './branding';
export function Empty({ title, description, action, onPress, error }) {
  const { colors } = useTheme(),
    styles = useUiStyles(),
    Icon = error ? WifiOff : PackageOpen;
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: 58,
        paddingHorizontal: 20,
      }}
    >
      <IconBadge
        icon={Icon}
        size={94}
        color={error ? colors.red : colors.purple}
        background={error ? colors.dangerSurface : colors.tint}
      />
      <Txt
        style={{
          fontSize: 20,
          fontWeight: '700',
          marginTop: 22,
          textAlign: 'center',
        }}
      >
        {title}
      </Txt>
      <Txt style={[styles.small, { textAlign: 'center', marginVertical: 12 }]}>
        {description}
      </Txt>
      {action && (
        <Button onPress={onPress} style={{ minWidth: 170, marginTop: 8 }}>
          {action}
        </Button>
      )}
    </View>
  );
}
export function Loading() {
  const { colors } = useTheme(),
    styles = useUiStyles();
  return (
    <View
      style={{ padding: 70, alignItems: 'center' }}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator size="large" color={colors.purple} />
      <Heading>Loading...</Heading>
      <Txt style={styles.small}>Please wait while we fetch data.</Txt>
    </View>
  );
}
export function CheckRow({ checked, onPress, children }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[base.row, { paddingVertical: 15 }]}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Check size={18} color="white" />}
      </View>
      <Txt style={{ flex: 1 }}>{children}</Txt>
    </Pressable>
  );
}
const base = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
function createStyles(colors) {
  return StyleSheet.create({
    text: {
      fontFamily: FONT,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      lineHeight: 23,
    },
    small: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.muted,
      lineHeight: 20,
    },
    heading: {
      fontSize: 20,
      fontWeight: '700',
      marginVertical: 17,
      color: colors.deep,
      lineHeight: 28,
    },
    row: base.row,
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 19,
      padding: 17,
      marginBottom: 13,
      shadowColor: colors.shadow,
      shadowOpacity: 0.025,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
    },
    button: {
      minHeight: 52,
      borderRadius: 14,
      justifyContent: 'center',
      paddingHorizontal: 17,
      paddingVertical: 12,
    },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 7 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      backgroundColor: colors.surface,
    },
    input: {
      fontFamily: FONT,
      fontWeight: '500',
      flex: 1,
      minHeight: 52,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: 15,
    },
    chip: {
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.tint,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
}
export const s = createStyles(lightColors);
