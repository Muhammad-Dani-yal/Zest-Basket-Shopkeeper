import BottomNavigation from '../components/BottomNavigation';
import {
  AppearanceControl,
  ThemeToggle,
} from '../components/AppearanceControl';
import { useTheme } from '../theme/ThemeContext';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StatusBar,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  RefreshControl,
  AppState,
  Share,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  ShoppingBag,
  Package,
  Settings,
  Bell,
  Menu,
  ArrowLeft,
  X,
  Store,
  Wallet,
  ChartColumn,
  History,
  ShieldCheck,
  Headphones,
  User,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Camera,
  Clock,
  Phone,
  CheckCircle2,
  Download,
  AlertTriangle,
  Award,
} from '../components/icons';
import { launchImageLibrary } from 'react-native-image-picker';
import { request } from '../services/client';
import { config } from '../services/config';
import { restockPlan, preparationQueue, localDay } from '../services/insights';
import { selectImage } from '../services/media';
import { shareReceiptPDF } from '../services/receipts';
import {
  Txt,
  Heading,
  Row,
  Card,
  Button,
  Field,
  Chips,
  Pill,
  LinkRow,
  Logo,
  Hero,
  Avatar,
  ShopkeeperSplash,
  ProductImage,
  Empty,
  Loading,
  CheckRow,
  money,
  date,
  IconBadge,
  useUiStyles,
} from '../components/ui';
const Context = createContext();
const useApp = () => useContext(Context);
const privateRoutes = ['dashboard', 'orders', 'inventory', 'settings'];
const titles = {
  dashboard: 'FreshMart',
  inventory: 'Inventory',
  product: 'Add Product',
  orders: 'Orders',
  order: 'Order Details',
  receipt: 'Order Receipt',
  preparation: 'Order Preparation',
  packing: 'Packing Confirmation',
  rider: 'Rider Assignment & Handover',
  earnings: 'Payments & Earnings',
  reports: 'Sales Reports',
  support: 'Customer Complaints & Support',
  ticket: 'Support Conversation',
  profile: 'Shop Profile & Operating Hours',
  status: 'Manage Shop Status',
  security: 'Security & Account',
  notifications: 'Notifications',
  history: 'Inventory History',
  settings: 'Settings',
  register: 'Register Your Shop',
  login: 'Shopkeeper Login',
  recover: 'Recover Password',
  password: 'Change Password',
  sessions: 'Active Sessions',
  hours: 'Operating Hours',
  rewards: 'Golden Points History',
  verification: 'Verification Documents',
};
export default function Portal() {
  const { colors: C, dark } = useTheme();
  const s = useUiStyles();
  const styles = useMemo(() => createStyles(C), [C]);
  const [splashVisible, setSplashVisible] = useState(true);
  useEffect(() => {
    const splashTimer = setTimeout(() => setSplashVisible(false), 1800);
    return () => clearTimeout(splashTimer);
  }, []);
  const [me, setMe] = useState(null),
    [boot, setBoot] = useState(true),
    [bootError, setBootError] = useState(''),
    [routes, setRoutes] = useState([
      {
        name: 'welcome',
      },
    ]),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(''),
    [dialog, setDialog] = useState(null),
    [drawer, setDrawer] = useState(false);
  const lock = useRef(false),
    timer = useRef(null),
    route = routes[routes.length - 1];
  const notify = useCallback(message => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 4200);
  }, []);
  const nav = useCallback((name, params = {}) => {
    setDrawer(false);
    setRoutes(r =>
      privateRoutes.includes(name)
        ? [
            {
              name,
              ...params,
            },
          ]
        : [
            ...r,
            {
              name,
              ...params,
            },
          ],
    );
  }, []);
  const back = useCallback(() => {
    if (drawer) {
      setDrawer(false);
      return true;
    }
    if (dialog) {
      setDialog(null);
      return true;
    }
    if (routes.length > 1) {
      setRoutes(r => r.slice(0, -1));
      return true;
    }
    if (me && route.name !== 'dashboard') {
      setRoutes([
        {
          name: 'dashboard',
        },
      ]);
      return true;
    }
    return false;
  }, [drawer, dialog, routes.length, me, route.name]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      back,
    );
    return () => subscription.remove();
  }, [back]);
  const initialize = useCallback(async () => {
    setBoot(true);
    setBootError('');
    try {
      const data = await request('/auth/me');
      setMe(data);
      setRoutes([
        {
          name: data ? 'dashboard' : 'welcome',
        },
      ]);
    } catch (e) {
      setBootError(e.message);
    } finally {
      setBoot(false);
    }
  }, []);
  useEffect(() => {
    initialize();
    return () => clearTimeout(timer.current);
  }, [initialize]);
  const refresh = useCallback(async () => {
    const data = await request('/auth/me');
    if (!data)
      throw Object.assign(new Error('Please log in again'), {
        status: 401,
      });
    setMe(data);
    setRevision(v => v + 1);
  }, []);
  const act = useCallback(
    async (path, method = 'POST', body, success) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        const result = await request(path, method, body);
        if (result?.error) {
          setRevision(v => v + 1);
          throw new Error(result.error);
        }
        if (
          !['/auth/logout', '/auth/recover-password'].includes(path) &&
          !(path === '/auth/register' && config.mode === 'api')
        )
          await refresh();
        if (success) notify(success);
        return result;
      } catch (e) {
        notify(
          e.message === 'Aborted'
            ? 'Request timed out. Please try again.'
            : e.message,
        );
        if (e.status === 401 && path !== '/auth/login') {
          setMe(null);
          setRoutes([
            {
              name: 'login',
            },
          ]);
        }
        throw e;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [notify, refresh],
  );
  const login = async (path, body) => {
    try {
      await act(path, 'POST', body);
      if (path === '/auth/register' && config.mode === 'api') {
        notify('Shop registered. Please log in. Verification is pending.');
        setRoutes([
          {
            name: 'login',
          },
        ]);
      } else
        setRoutes([
          {
            name: 'dashboard',
          },
        ]);
    } catch {}
  };
  const logout = () =>
    setDialog({
      title: 'Log out?',
      text: 'Your saved shop data will remain on this device.',
      confirm: 'Logout',
      run: async () => {
        await act('/auth/logout');
        setMe(null);
        setRoutes([
          {
            name: 'login',
          },
        ]);
      },
    });
  const expire = useCallback(() => {
    setMe(null);
    setRoutes([
      {
        name: 'login',
      },
    ]);
  }, []);
  const app = {
    me,
    nav,
    back,
    route,
    revision,
    busy,
    notify,
    act,
    refresh,
    setDialog,
    login,
    logout,
    expire,
  };
  const Screen =
    {
      welcome: Welcome,
      login: Auth,
      register: Auth,
      recover: Auth,
      dashboard: Dashboard,
      inventory: Inventory,
      product: ProductForm,
      orders: Orders,
      order: OrderScreen,
      receipt: OrderScreen,
      preparation: OrderScreen,
      packing: OrderScreen,
      rider: OrderScreen,
      earnings: Finance,
      reports: Finance,
      settings: SettingsScreen,
      profile: Profile,
      hours: Hours,
      status: ShopStatus,
      security: Security,
      password: Password,
      sessions: Sessions,
      notifications: Notifications,
      history: InventoryHistory,
      support: Support,
      ticket: Ticket,
      rewards: Rewards,
      verification: Verification,
    }[route.name] || Dashboard;
  const authenticated = !!me;
  return (
    <Context.Provider value={app}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar
          backgroundColor={C.bg}
          barStyle={dark ? 'light-content' : 'dark-content'}
        />
        {boot || splashVisible ? (
          <ShopkeeperSplash />
        ) : bootError ? (
          <Empty
            error
            title="Unable to load saved app"
            description={bootError}
            action="Retry"
            onPress={initialize}
          />
        ) : (
          <>
            {route.name !== 'welcome' && (
              <View
                style={[
                  styles.header,
                  route.name === 'dashboard' && {
                    backgroundColor: C.primary,
                  },
                ]}
              >
                <Pressable
                  accessibilityLabel={
                    route.name === 'dashboard' ? 'Open menu' : 'Go back'
                  }
                  hitSlop={12}
                  onPress={() =>
                    route.name === 'dashboard' ? setDrawer(true) : back()
                  }
                >
                  {route.name === 'dashboard' ? (
                    <Menu size={23} color="white" />
                  ) : (
                    <ArrowLeft size={22} color={C.purple} />
                  )}
                </Pressable>
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Txt
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: route.name === 'dashboard' ? 'white' : C.deep,
                    }}
                  >
                    {route.name === 'dashboard'
                      ? me?.shop.shopName
                      : route.name === 'product' && route.id
                      ? 'Edit Product'
                      : titles[route.name]}
                  </Txt>
                  {route.name === 'dashboard' && (
                    <Txt
                      style={{
                        fontSize: 10,
                        color: '#E9DFFF',
                      }}
                    >
                      {me?.shop.verificationStatus} ·{' '}
                      {me?.shop.status === 'active' ? 'Open' : me?.shop.status}
                    </Txt>
                  )}
                </View>
                {authenticated && (
                  <ThemeToggle
                    onBrand={route.name === 'dashboard'}
                    onError={e => notify(e.message)}
                  />
                )}
                {authenticated && (
                  <Pressable
                    accessibilityLabel="Notifications"
                    onPress={() => nav('notifications')}
                    hitSlop={10}
                  >
                    <Bell
                      size={22}
                      color={route.name === 'dashboard' ? 'white' : C.purple}
                    />
                  </Pressable>
                )}
                {route.name === 'dashboard' && (
                  <Pressable
                    accessibilityLabel="Shop profile"
                    onPress={() => nav('profile')}
                  >
                    <Avatar size={36} />
                  </Pressable>
                )}
              </View>
            )}
            <KeyboardAvoidingView
              style={{
                flex: 1,
              }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView
                key={route.name + String(route.id || '')}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  authenticated &&
                  [
                    'dashboard',
                    'orders',
                    'inventory',
                    'notifications',
                    'history',
                    'earnings',
                    'reports',
                    'support',
                  ].includes(route.name) ? (
                    <RefreshControl
                      refreshing={false}
                      tintColor={C.purple}
                      onRefresh={() => refresh().catch(e => notify(e.message))}
                    />
                  ) : undefined
                }
                contentContainerStyle={[
                  styles.content,
                  route.name === 'welcome' && {
                    padding: 0,
                  },
                  route.name === 'dashboard' && {
                    paddingTop: 12,
                  },
                ]}
              >
                <Screen />
              </ScrollView>
            </KeyboardAvoidingView>
            {authenticated && (
              <BottomNavigation route={route} onNavigate={nav} />
            )}
          </>
        )}
        {toast !== '' && (
          <Pressable
            accessibilityLiveRegion="polite"
            onPress={() => setToast('')}
            style={styles.toast}
          >
            <Txt
              style={{
                color: 'white',
                textAlign: 'center',
              }}
            >
              {toast}
            </Txt>
          </Pressable>
        )}
        <Modal
          visible={drawer}
          animationType="slide"
          transparent
          onRequestClose={() => setDrawer(false)}
        >
          <View style={styles.overlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Close menu"
              onPress={() => setDrawer(false)}
            />
            <SafeAreaView style={styles.drawer}>
              <ScrollView>
                <Row>
                  <Avatar size={64} />
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Heading>{me?.shop.shopName}</Heading>
                    <Pill>{me?.shop.verificationStatus}</Pill>
                  </View>
                  <Pressable
                    accessibilityLabel="Close menu"
                    onPress={() => setDrawer(false)}
                  >
                    <X color={C.purple} />
                  </Pressable>
                </Row>
                {menuItems.map(([title, name, Icon]) => (
                  <LinkRow
                    key={name}
                    title={title}
                    icon={Icon}
                    onPress={() => nav(name)}
                  />
                ))}
                <LinkRow
                  title="Logout"
                  icon={LogOut}
                  onPress={() => {
                    setDrawer(false);
                    logout();
                  }}
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
        <Modal
          visible={!!dialog}
          animationType="fade"
          transparent
          onRequestClose={() => !busy && setDialog(null)}
        >
          <View
            style={[
              styles.overlay,
              {
                justifyContent: 'center',
                padding: 24,
              },
            ]}
          >
            <Pressable
              accessibilityLabel="Dismiss confirmation"
              style={StyleSheet.absoluteFill}
              disabled={busy}
              onPress={() => setDialog(null)}
            />
            <View accessibilityViewIsModal style={styles.modal}>
              <IconBadge icon={AlertTriangle} size={54} />
              <Heading>{dialog?.title}</Heading>
              <Txt style={s.small}>{dialog?.text}</Txt>
              <Row
                style={{
                  marginTop: 18,
                }}
              >
                <Button
                  outline
                  disabled={busy}
                  style={{
                    flex: 1,
                  }}
                  onPress={() => setDialog(null)}
                >
                  Cancel
                </Button>
                <Button
                  danger={dialog?.danger}
                  disabled={busy}
                  style={{
                    flex: 1,
                  }}
                  onPress={async () => {
                    try {
                      await dialog.run();
                      setDialog(null);
                    } catch {}
                  }}
                >
                  {busy ? 'Please wait…' : dialog?.confirm || 'Confirm'}
                </Button>
              </Row>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Context.Provider>
  );
}
const menuItems = [
  ['Dashboard', 'dashboard', Home],
  ['Orders', 'orders', ShoppingBag],
  ['Inventory', 'inventory', Package],
  ['Earnings', 'earnings', Wallet],
  ['Sales Reports', 'reports', ChartColumn],
  ['Shop Profile', 'profile', Store],
  ['Shop Status', 'status', CheckCircle2],
  ['Support', 'support', Headphones],
  ['Notifications', 'notifications', Bell],
  ['Settings', 'settings', Settings],
];
function useData(path) {
  const { revision, notify, expire } = useApp();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const seq = useRef(0);
  const load = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const value = await request(path);
      if (n === seq.current) setData(value);
    } catch (e) {
      if (n === seq.current) setError(e.message);
      if (n === seq.current && e.status === 401) {
        notify('Session expired. Please login.');
        expire();
      }
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [path, expire, notify]);
  useEffect(() => {
    const sequence = seq;
    load();
    const poll =
      config.mode === 'api'
        ? setInterval(() => {
            if (AppState.currentState === 'active') load();
          }, 15000)
        : null;
    const sub = AppState.addEventListener('change', v => {
      if (v === 'active') load();
    });
    return () => {
      sequence.current++;
      if (poll) clearInterval(poll);
      sub.remove();
    };
  }, [load, revision]);
  return {
    data,
    loading,
    error,
    load,
  };
}
function Data({ q, children }) {
  return q.loading && !q.data ? (
    <Loading />
  ) : q.error ? (
    <Empty
      error
      title="Network Error"
      description={q.error}
      action="Retry"
      onPress={q.load}
    />
  ) : q.data ? (
    children(q.data)
  ) : null;
}
function DemoNote() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  return (
    <Txt
      style={[
        s.small,
        {
          paddingVertical: 10,
          color: C.purple,
        },
      ]}
    >
      {config.mode === 'mock'
        ? 'LOCAL DEMO · Saved on this device. No live payments or SMS.'
        : 'CONNECTED API · Server authentication enabled.'}
    </Txt>
  );
}
function Welcome() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { nav } = useApp();
  return (
    <>
      <Hero welcome />
      <View
        style={{
          padding: 22,
        }}
      >
        <Heading>Your shop. One simple place.</Heading>
        <Txt style={s.small}>
          Manage orders, keep your shelves stocked and grow with ZestBasket.
        </Txt>
        <View
          style={{
            height: 18,
          }}
        />
        <Button onPress={() => nav('register')}>Register Your Shop</Button>
        <Button outline onPress={() => nav('login')}>
          Login
        </Button>
        <Txt
          style={{
            textAlign: 'center',
            fontSize: 12,
            marginTop: 12,
            color: C.purple,
          }}
          onPress={() => nav('login')}
        >
          Already have an account? Login
        </Txt>
        <DemoNote />
      </View>
    </>
  );
}
function Auth() {
  const s = useUiStyles();
  const { route, nav, login, act, busy, notify } = useApp();
  const register = route.name === 'register',
    recover = route.name === 'recover';
  const [f, setF] = useState({
      phone: '',
      password: '',
      fullName: '',
      cnic: '',
      confirm: '',
      shopName: '',
      address: '',
    }),
    [errors, setErrors] = useState({});
  const set = k => v =>
    setF(x => ({
      ...x,
      [k]: v,
    }));
  const submit = async () => {
    const e = {};
    if (!/^03\d{9}$/.test(f.phone.replace(/\D/g, '').replace(/^92/, '0')))
      e.phone = 'Enter a valid Pakistani mobile number (03xxxxxxxxx).';
    if (!recover && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.password))
      e.password = 'At least 8 characters, one letter and one number.';
    if (register) {
      ['fullName', 'shopName', 'address'].forEach(k => {
        if (!f[k].trim()) e[k] = 'This field is required.';
      });
      if (!/^\d{5}-\d{7}-\d$/.test(f.cnic)) e.cnic = 'Format: XXXXX-XXXXXXX-X';
      if (f.confirm !== f.password) e.confirm = 'Passwords must match.';
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    if (recover) {
      try {
        const r = await act('/auth/recover-password', 'POST', {
          phone: f.phone,
        });
        notify(r.message || 'Recovery request submitted');
      } catch {}
      return;
    }
    login('/auth/' + (register ? 'register' : 'login'), f);
  };
  return (
    <>
      <Logo />
      <Heading>
        {recover
          ? 'Forgot your password?'
          : register
          ? 'Start your journey with ZestBasket'
          : 'Shopkeeper Login'}
      </Heading>
      {register && (
        <>
          <Txt style={s.small}>Grow your business with a fresh start.</Txt>
          <Heading>Shop Owner Details</Heading>
          <Field
            label="Full Name *"
            value={f.fullName}
            onChangeText={set('fullName')}
            error={errors.fullName}
          />
          <Field
            label="CNIC Number *"
            placeholder="XXXXX-XXXXXXX-X"
            value={f.cnic}
            onChangeText={v => {
              const digits = v.replace(/\D/g, '').slice(0, 13);
              set('cnic')(
                digits.length > 12
                  ? `${digits.slice(0, 5)}-${digits.slice(
                      5,
                      12,
                    )}-${digits.slice(12)}`
                  : digits.length > 5
                  ? `${digits.slice(0, 5)}-${digits.slice(5)}`
                  : digits,
              );
            }}
            maxLength={15}
            keyboardType="number-pad"
            error={errors.cnic}
          />
        </>
      )}
      <Field
        label="Phone Number *"
        placeholder="03001234567"
        keyboardType="phone-pad"
        value={f.phone}
        onChangeText={set('phone')}
        error={errors.phone}
      />
      {!recover && (
        <Field
          label="Password *"
          secret
          value={f.password}
          onChangeText={set('password')}
          error={errors.password}
        />
      )}{' '}
      {register && (
        <>
          <Field
            label="Confirm Password *"
            secret
            value={f.confirm}
            onChangeText={set('confirm')}
            error={errors.confirm}
          />
          <Heading>Shop Details</Heading>
          <Field
            label="Shop Name *"
            value={f.shopName}
            onChangeText={set('shopName')}
            error={errors.shopName}
          />
          <Field
            label="Shop Address *"
            value={f.address}
            onChangeText={set('address')}
            error={errors.address}
          />
        </>
      )}
      <Button disabled={busy} onPress={submit}>
        {busy
          ? 'Please wait…'
          : recover
          ? 'Request Recovery'
          : register
          ? 'Register Your Shop'
          : 'Login'}
      </Button>
      {!register && !recover && (
        <>
          <Button outline onPress={() => nav('recover')}>
            Forgot Password?
          </Button>
          <View
            style={{
              height: 22,
            }}
          />
          <Button
            outline
            disabled={busy}
            onPress={() => login('/auth/demo', {})}
          >
            Demo Login (For Testing)
          </Button>
        </>
      )}
      <Button outline onPress={() => nav(register ? 'login' : 'register')}>
        {register
          ? 'Already have an account? Login'
          : 'New shop? Register Your Shop'}
      </Button>
      <DemoNote />
      {register && config.mode === 'mock' && (
        <Txt style={s.small}>
          Demo registration previews onboarding, saves the profile and opens a
          local session. Passwords are never saved. Use Demo Login to return.
        </Txt>
      )}
    </>
  );
}
function Dashboard() {
  const { colors: C } = useTheme();
  const { me, nav, act, busy } = useApp(),
    q = useData('/orders'),
    n = useData('/notifications');
  return (
    <>
      <Hero
        onInventory={() => nav('inventory')}
        onOrders={() => nav('orders')}
      />
      <DemoNote />
      <Row>
        <Txt
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: '700',
          }}
        >
          Hello, {me.user.fullName.split(' ')[0]}
        </Txt>
        <Pill>{me.shop.status}</Pill>
      </Row>
      <View
        style={{
          height: 16,
        }}
      />
      <Data q={q}>
        {orders => (
          <>
            <Row
              style={{
                gap: 8,
              }}
            >
              {[
                [
                  'New Orders',
                  orders.filter(o => o.status === 'New').length,
                  () =>
                    nav('orders', {
                      filter: 'New',
                    }),
                ],
                [
                  'Active Orders',
                  orders.filter(o =>
                    [
                      'Accepted',
                      'Preparing',
                      'Ready for Pickup',
                      'Handed Over',
                    ].includes(o.status),
                  ).length,
                  () =>
                    nav('orders', {
                      filter: 'Active',
                    }),
                ],
                [
                  "Today's Sales",
                  money(
                    orders
                      .filter(
                        o =>
                          o.status === 'Delivered' &&
                          localDay(o.updatedAt || o.createdAt) === localDay(),
                      )
                      .reduce((sum, o) => sum + o.subtotal, 0),
                  ),
                  () => nav('earnings'),
                ],
              ].map(([label, value, onPress]) => (
                <Card
                  key={label}
                  onPress={onPress}
                  style={{
                    flex: 1,
                    padding: 10,
                    minHeight: 90,
                  }}
                >
                  <Txt
                    style={{
                      fontSize: 10,
                      color: C.muted,
                    }}
                  >
                    {label}
                  </Txt>
                  <Txt
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: C.purple,
                      marginTop: 9,
                    }}
                  >
                    {value}
                  </Txt>
                </Card>
              ))}
            </Row>
            {preparationQueue(orders).length > 0 && (
              <Card>
                <Heading>Preparation Priority</Heading>
                {preparationQueue(orders).map(o => (
                  <LinkRow
                    key={o.id}
                    icon={Clock}
                    title={`${o.orderNumber} · ${o.elapsedMinutes} min${
                      o.elapsedMinutes >= 10 ? ' · Target exceeded' : ''
                    }`}
                    onPress={() => nav('preparation', { id: o.id })}
                  />
                ))}
              </Card>
            )}
            <Row>
              <Heading>Recent Orders</Heading>
              <View
                style={{
                  flex: 1,
                }}
              />
              <Txt
                onPress={() => nav('orders')}
                style={{
                  color: C.purple,
                }}
              >
                View All →
              </Txt>
            </Row>
            {orders
              .filter(o => o.status === 'New')
              .slice(0, 2)
              .map(o => (
                <OrderCard key={o.id} o={o} />
              ))}
            {!orders.some(o => o.status === 'New') && (
              <Card>
                <Txt>No new orders. You're all caught up!</Txt>
              </Card>
            )}
          </>
        )}
      </Data>
      <Card onPress={() => nav('notifications')}>
        <Row>
          <Bell color={C.purple} size={20} />
          <Txt>
            {n.data?.filter(x => !x.read).length || 0} unread notifications
          </Txt>
        </Row>
      </Card>
      {config.mode === 'mock' && (
        <Button
          outline
          disabled={busy}
          icon={Plus}
          onPress={() =>
            act('/demo/orders', 'POST', {}, 'Demo order received').catch(
              () => {},
            )
          }
        >
          Create Demo Order
        </Button>
      )}
    </>
  );
}
function OrderCard({ o }) {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { nav, act, busy } = useApp();
  return (
    <Card>
      <Row style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {o.items.slice(0, 4).map(item => (
          <ProductImage
            key={item.productId || item.name}
            product={item}
            size={56}
          />
        ))}
      </Row>
      <Row>
        <Txt
          style={{
            fontWeight: '800',
            color: C.purple,
            flex: 1,
          }}
        >
          #{o.orderNumber}
        </Txt>
        <Pill>{o.status}</Pill>
      </Row>
      <Txt
        style={{
          marginTop: 8,
        }}
      >
        {o.customer.name}
      </Txt>
      <Txt style={s.small}>
        {date(o.createdAt)} · {o.items.length} items
      </Txt>
      <Txt
        style={{
          fontWeight: '700',
          marginTop: 6,
        }}
      >
        {money(o.total)}
      </Txt>
      <Row
        style={{
          marginTop: 10,
        }}
      >
        {o.status === 'New' && (
          <>
            <Button
              outline
              style={{
                flex: 1,
              }}
              onPress={() =>
                nav('order', {
                  id: o.id,
                  reject: true,
                })
              }
            >
              Reject
            </Button>
            <Button
              disabled={busy}
              style={{
                flex: 1,
              }}
              onPress={() =>
                act(
                  `/orders/${o.id}/accept`,
                  'POST',
                  {},
                  'Order accepted',
                ).catch(() => {})
              }
            >
              Accept
            </Button>
          </>
        )}
        <Button
          outline
          style={{
            flex: 1,
          }}
          onPress={() =>
            nav('order', {
              id: o.id,
            })
          }
        >
          Details
        </Button>
      </Row>
    </Card>
  );
}
function Inventory() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { nav, act, setDialog, busy } = useApp(),
    q = useData('/products');
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState('All'),
    [stockFilter, setStockFilter] = useState('All Stock');
  return (
    <>
      <Row>
        <View
          style={{
            flex: 1,
          }}
        >
          <Field
            label="Search products"
            placeholder="Search your shelves…"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Button icon={Plus} onPress={() => nav('product')}>
          Add
        </Button>
      </Row>
      <Chips
        values={[
          'All',
          'Fruits',
          'Vegetables',
          'Dairy',
          'Bakery',
          'Grocery',
          'Others',
        ]}
        value={category}
        onChange={setCategory}
      />
      <Data q={q}>
        {products => {
          const restock = restockPlan(products);
          const rows = products.filter(
            p =>
              (category === 'All' || p.category === category) &&
              p.name.toLowerCase().includes(search.trim().toLowerCase()) &&
              (stockFilter === 'All Stock' ||
                restock.some(item => item.id === p.id)),
          );
          return (
            <>
              <Chips
                values={['All Stock', 'Needs Restock']}
                value={stockFilter}
                onChange={setStockFilter}
              />
              {restock.length > 0 && (
                <Card>
                  <Heading>Restock Planner</Heading>
                  <Txt>
                    Suggested top-up to 15 available units, keeping reserved
                    orders covered.
                  </Txt>
                  {restock.map(p => (
                    <LinkRow
                      key={p.id}
                      icon={Package}
                      title={`${p.name}: ${p.available} available · Top-up ${p.suggestedQuantity} ${p.unit}`}
                      onPress={() => nav('product', { id: p.id })}
                    />
                  ))}
                </Card>
              )}
              {rows.length ? (
                <>
                  {rows.map(p => (
                    <Card key={p.id}>
                      <Row>
                        <ProductImage product={p} />
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Txt
                            style={{
                              fontWeight: '700',
                            }}
                          >
                            {p.name}
                          </Txt>
                          <Txt style={s.small}>
                            {p.category} · {money(p.pricePkr)} / {p.unit}
                          </Txt>
                          <Txt style={s.small}>
                            Stock: {p.quantity} · Reserved: {p.reserved || 0}
                          </Txt>
                          <Pill>
                            {!p.isAvailable
                              ? 'Unavailable'
                              : p.quantity - (p.reserved || 0) <= 5
                              ? 'Low Stock'
                              : 'In Stock'}
                          </Pill>
                        </View>
                        <View>
                          <Pressable
                            accessibilityLabel={`Edit ${p.name}`}
                            style={{
                              padding: 10,
                            }}
                            onPress={() =>
                              nav('product', {
                                id: p.id,
                              })
                            }
                          >
                            <Pencil size={19} color={C.purple} />
                          </Pressable>
                          <Pressable
                            accessibilityLabel={`Delete ${p.name}`}
                            disabled={busy}
                            style={{
                              padding: 10,
                            }}
                            onPress={() =>
                              setDialog({
                                title: 'Delete Product?',
                                text: `Delete ${p.name}? This action is saved in inventory history.`,
                                confirm: 'Delete',
                                danger: true,
                                run: () =>
                                  act(
                                    '/products/' + p.id,
                                    'DELETE',
                                    undefined,
                                    'Product deleted',
                                  ),
                              })
                            }
                          >
                            <Trash2 size={19} color={C.red} />
                          </Pressable>
                        </View>
                      </Row>
                    </Card>
                  ))}
                  <Button outline icon={History} onPress={() => nav('history')}>
                    Inventory History
                  </Button>
                </>
              ) : (
                <Empty
                  title="No Products Found"
                  description={
                    products.length
                      ? 'Try another search or category.'
                      : 'Add your first product to get started.'
                  }
                  action={products.length ? 'Clear Filters' : 'Add Product'}
                  onPress={() =>
                    products.length
                      ? (setSearch(''),
                        setCategory('All'),
                        setStockFilter('All Stock'))
                      : nav('product')
                  }
                />
              )}
            </>
          );
        }}
      </Data>
    </>
  );
}
function ProductForm() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { route, act, busy, back, notify } = useApp(),
    q = useData('/products');
  const [f, setF] = useState({
      name: '',
      category: 'Grocery',
      pricePkr: '',
      quantity: '',
      unit: 'kg',
      description: '',
      isAvailable: true,
      imageUrl: '',
    }),
    [ready, setReady] = useState(!route.id),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (route.id && q.data && !ready) {
      const p = q.data.find(x => x.id === route.id);
      if (p) {
        setF(p);
        setReady(true);
      }
    }
  }, [q.data, route.id, ready]);
  const set = k => v =>
    setF(x => ({
      ...x,
      [k]: v,
    }));
  const image = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: config.mode === 'mock',
        maxWidth: 900,
        maxHeight: 900,
        quality: 0.8,
      });
      if (result.didCancel) return;
      if (result.errorCode)
        throw Error(result.errorMessage || 'Image selection failed');
      const asset = result.assets?.[0];
      if (!asset) return;
      setUploading(true);
      if (config.mode === 'mock') {
        if (!asset.base64) throw Error('Cannot read image');
        set('imageUrl')(
          `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`,
        );
      } else {
        const form = new FormData();
        form.append('image', {
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || 'product.jpg',
        });
        const r = await request('/uploads', 'POST', form);
        set('imageUrl')(r.url);
      }
    } catch (e) {
      notify(e.message);
    } finally {
      setUploading(false);
    }
  };
  const save = async () => {
    if (
      !f.name.trim() ||
      !String(f.pricePkr).trim() ||
      Number(f.pricePkr) <= 0 ||
      !String(f.quantity).trim() ||
      !Number.isInteger(Number(f.quantity)) ||
      Number(f.quantity) < 0
    ) {
      setError(
        'Enter a product name, positive price and whole stock quantity.',
      );
      return;
    }
    try {
      await act(
        '/products' + (route.id ? '/' + route.id : ''),
        route.id ? 'PATCH' : 'POST',
        {
          ...f,
          pricePkr: Number(f.pricePkr),
          quantity: Number(f.quantity),
        },
        'Product saved',
      );
      back();
    } catch {}
  };
  if (!ready)
    return (
      <Data q={q}>
        {() => <Empty title="Product not found" action="Back" onPress={back} />}
      </Data>
    );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upload product image"
        onPress={image}
        style={{
          alignItems: 'center',
          padding: 25,
          backgroundColor: C.tint,
          borderRadius: 16,
          marginBottom: 18,
        }}
      >
        {f.imageUrl || f.name?.trim() ? (
          <ProductImage product={f} size={112} />
        ) : (
          <Camera color={C.purple} size={40} />
        )}
        <Txt
          style={{
            color: C.purple,
            marginTop: 10,
          }}
        >
          {uploading ? 'Uploading…' : 'Tap to upload image'}
        </Txt>
      </Pressable>
      <Field label="Product Name *" value={f.name} onChangeText={set('name')} />
      <Txt style={s.label}>Category *</Txt>
      <Chips
        values={[
          'Grocery',
          'Fruits',
          'Vegetables',
          'Dairy',
          'Bakery',
          'Others',
        ]}
        value={f.category}
        onChange={set('category')}
      />
      <Row>
        <View
          style={{
            flex: 1,
          }}
        >
          <Field
            label="Price (PKR) *"
            keyboardType="decimal-pad"
            value={f.pricePkr}
            onChangeText={set('pricePkr')}
          />
        </View>
        <View
          style={{
            flex: 1,
          }}
        >
          <Field
            label="Stock Quantity *"
            keyboardType="number-pad"
            value={f.quantity}
            onChangeText={set('quantity')}
          />
        </View>
      </Row>
      <Txt style={s.label}>Unit *</Txt>
      <Chips
        values={['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'pack']}
        value={f.unit}
        onChange={set('unit')}
      />
      <Field
        label="Description"
        multiline
        value={f.description}
        onChangeText={set('description')}
      />
      <Row
        style={{
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Txt>Available for orders</Txt>
        <Switch
          value={f.isAvailable}
          onValueChange={set('isAvailable')}
          trackColor={{
            true: C.green,
            false: C.border,
          }}
        />
      </Row>
      {error !== '' && (
        <Txt
          style={{
            color: C.red,
          }}
        >
          {error}
        </Txt>
      )}
      <Button disabled={busy || uploading} onPress={save}>
        {busy ? 'Saving…' : 'Save Product'}
      </Button>
    </>
  );
}
function Orders() {
  const { route } = useApp(),
    q = useData('/orders');
  const [tab, setTab] = useState(route.filter || 'New');
  return (
    <>
      <Chips
        values={['New', 'Accepted', 'Preparing', 'Ready', 'Active', 'All']}
        value={tab}
        onChange={setTab}
      />
      <Data q={q}>
        {orders => {
          const rows = orders.filter(
            o =>
              tab === 'All' ||
              (tab === 'Active'
                ? [
                    'Accepted',
                    'Preparing',
                    'Ready for Pickup',
                    'Handed Over',
                  ].includes(o.status)
                : o.status === (tab === 'Ready' ? 'Ready for Pickup' : tab)),
          );
          return rows.length ? (
            rows.map(o => <OrderCard key={o.id} o={o} />)
          ) : (
            <Empty
              title="No Orders Yet"
              description="Your new orders will appear here."
              action="Refresh"
              onPress={q.load}
            />
          );
        }}
      </Data>
    </>
  );
}
function Totals({ o }) {
  return (
    <Card>
      {[
        ['Subtotal', o.subtotal],
        ['Delivery Fee', o.deliveryFee],
        ['Total', o.total],
      ].map(([k, v]) => (
        <Row
          key={k}
          style={{
            justifyContent: 'space-between',
            paddingVertical: 4,
          }}
        >
          <Txt
            style={{
              fontWeight: k === 'Total' ? '800' : '400',
            }}
          >
            {k}
          </Txt>
          <Txt
            style={{
              fontWeight: k === 'Total' ? '800' : '400',
            }}
          >
            {money(v)}
          </Txt>
        </Row>
      ))}
    </Card>
  );
}
function Items({ o }) {
  const s = useUiStyles();
  return (
    <Card>
      {o.items.map(i => (
        <Row
          key={i.productId}
          style={{
            paddingVertical: 9,
          }}
        >
          <ProductImage product={i} size={52} />
          <View
            style={{
              flex: 1,
            }}
          >
            <Txt
              style={{
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {i.name}
            </Txt>
            <Txt style={s.small}>
              {i.quantity} × {money(i.price)}
            </Txt>
          </View>
          <Txt
            style={{
              fontSize: 12,
            }}
          >
            {money(i.quantity * i.price)}
          </Txt>
        </Row>
      ))}
    </Card>
  );
}
function OrderScreen() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { route, nav, act, busy, notify, me } = useApp(),
    q = useData('/orders/' + route.id);
  const [reason, setReason] = useState(''),
    [exporting, setExporting] = useState(false),
    [reject, setReject] = useState(!!route.reject),
    [checked, setChecked] = useState([]),
    [otp, setOtp] = useState(''),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const action = async (name, body = {}, to) => {
    try {
      await act(`/orders/${route.id}/${name}`, 'POST', body, 'Order updated');
      if (to)
        nav(to, {
          id: route.id,
        });
    } catch {}
  };
  const share = async o => {
    try {
      await Share.share({
        title: 'ZestBasket Receipt',
        message: `ZestBasket · ${o.isDemo ? 'DEMO RECEIPT' : ''}\nOrder #${
          o.orderNumber
        }\n${date(o.createdAt)}\n${o.customer.name}\n${o.address}\n\n${o.items
          .map(i => `${i.name} × ${i.quantity}: ${money(i.price * i.quantity)}`)
          .join('\n')}\nSubtotal: ${money(o.subtotal)}\nDelivery: ${money(
          o.deliveryFee,
        )}\nTotal: ${money(o.total)}\n${o.paymentMethod} · ${
          o.paymentStatus
        }\nStatus: ${o.status}`,
      });
    } catch (e) {
      notify(e.message);
    }
  };
  return (
    <Data q={q}>
      {o => {
        if (route.name === 'receipt')
          return (
            <>
              <Logo />
              <Heading>Order ID #{o.orderNumber}</Heading>
              <Txt style={s.small}>
                {date(o.createdAt)}
                {'\n'}
                {o.address}
              </Txt>
              <Items o={o} />
              <Totals o={o} />
              <Card>
                <Txt>
                  Payment: {o.paymentMethod} · {o.paymentStatus}
                </Txt>
                <Txt style={s.small}>{o.instructions}</Txt>
                <Pill>{o.status}</Pill>
              </Card>
              <DemoNote />
              <Button
                icon={Download}
                disabled={exporting}
                onPress={async () => {
                  setExporting(true);
                  try {
                    await shareReceiptPDF(o, me.shop);
                  } catch (e) {
                    notify(e.message);
                  } finally {
                    setExporting(false);
                  }
                }}
              >
                {exporting ? 'Creating PDF…' : 'Download / Share PDF'}
              </Button>
              <Button outline onPress={() => share(o)}>
                Share / Save Receipt
              </Button>
            </>
          );
        if (route.name === 'preparation') {
          const left = Math.max(
            0,
            600 -
              Math.floor(
                (now - Date.parse(o.preparationStartedAt || o.createdAt)) /
                  1000,
              ),
          );
          return (
            <>
              <Card>
                <Heading>#{o.orderNumber}</Heading>
                <View
                  style={{
                    alignItems: 'center',
                    padding: 25,
                  }}
                >
                  <Clock color={C.orange} size={34} />
                  <Txt
                    style={{
                      fontSize: 48,
                      lineHeight: 62,
                      color: C.orange,
                      fontWeight: '800',
                    }}
                  >
                    {String(Math.floor(left / 60)).padStart(2, '0')}:
                    {String(left % 60).padStart(2, '0')}
                  </Txt>
                  <Txt>10 Minute Target</Txt>
                  <Txt
                    style={[
                      s.small,
                      {
                        color: left ? C.muted : C.red,
                      },
                    ]}
                  >
                    {o.status !== 'Preparing'
                      ? 'Preparation complete'
                      : left
                      ? 'A little care makes every order better.'
                      : 'Order is late. Finish packing soon.'}
                  </Txt>
                </View>
                <Row
                  style={{
                    justifyContent: 'space-around',
                  }}
                >
                  {['Accepted', 'Preparing', 'Packing', 'Ready'].map(t => (
                    <View
                      key={t}
                      style={{
                        alignItems: 'center',
                      }}
                    >
                      <CheckCircle2 size={20} color={C.purple} />
                      <Txt
                        style={{
                          fontSize: 10,
                        }}
                      >
                        {t}
                      </Txt>
                    </View>
                  ))}
                </Row>
              </Card>
              <Rewards compact />
              {o.status === 'Preparing' && (
                <Button
                  onPress={() =>
                    nav('packing', {
                      id: o.id,
                    })
                  }
                >
                  Continue to Packing
                </Button>
              )}
              {o.status === 'Ready for Pickup' && (
                <Button
                  onPress={() =>
                    nav('rider', {
                      id: o.id,
                    })
                  }
                >
                  Rider & Handover
                </Button>
              )}
            </>
          );
        }
        if (route.name === 'packing')
          return (
            <>
              <View
                style={{
                  alignItems: 'center',
                  paddingVertical: 30,
                }}
              >
                <Package size={66} color={C.orange} />
                <Heading>Order Pack Ho Gaya?</Heading>
                <Txt
                  style={[
                    s.small,
                    {
                      textAlign: 'center',
                    },
                  ]}
                >
                  Kya aap ne order ke tamam items{'\n'}check karke pack kar liye
                  hain?
                </Txt>
              </View>
              <Card>
                {o.items.map(i => (
                  <CheckRow
                    key={i.productId}
                    checked={checked.includes(i.productId)}
                    onPress={() =>
                      setChecked(x =>
                        x.includes(i.productId)
                          ? x.filter(v => v !== i.productId)
                          : [...x, i.productId],
                      )
                    }
                  >
                    {i.name} × {i.quantity}
                  </CheckRow>
                ))}
              </Card>
              <Button
                disabled={
                  busy ||
                  checked.length !== o.items.length ||
                  o.status !== 'Preparing'
                }
                onPress={() =>
                  action(
                    'confirm-packing',
                    {
                      checkedItems: checked,
                      items: o.items
                        .filter(i => checked.includes(i.productId))
                        .map(i => ({
                          productId: i.productId,
                          quantity: i.quantity,
                        })),
                    },
                    'rider',
                  )
                }
              >
                Haan, Confirm Karo
              </Button>
              <Button
                outline
                onPress={() =>
                  nav('preparation', {
                    id: o.id,
                  })
                }
              >
                Nahi, Wapas Jao
              </Button>
            </>
          );
        if (route.name === 'rider')
          return (
            <>
              <Heading>Rider Assigned</Heading>
              <Card>
                <Row>
                  <Avatar size={72} rider />
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Heading>{o.rider?.name || 'Awaiting assignment'}</Heading>
                    <Txt
                      onPress={() =>
                        o.rider?.phone &&
                        Linking.openURL('tel:' + o.rider.phone).catch(e =>
                          notify(e.message),
                        )
                      }
                      style={{
                        color: C.purple,
                      }}
                    >
                      {o.rider?.phone}
                    </Txt>
                    <Pill>Available</Pill>
                  </View>
                </Row>
              </Card>
              <Card>
                <Heading>Rider Details</Heading>
                <Txt>Bike: {o.rider?.bikeModel || '—'}</Txt>
                <Txt style={s.small}>
                  License: {o.rider?.licensePlate || '—'}
                </Txt>
              </Card>
              <Card>
                <Heading>Order Status</Heading>
                {[
                  'Rider Assigned',
                  'Ready for Pickup',
                  'Handed Over',
                  'Delivered',
                ].map((v, i) => (
                  <Row
                    key={v}
                    style={{
                      paddingVertical: 12,
                    }}
                  >
                    <CheckCircle2
                      size={20}
                      color={
                        i <=
                        (o.status === 'Delivered'
                          ? 3
                          : o.status === 'Handed Over'
                          ? 2
                          : o.status === 'Ready for Pickup'
                          ? 1
                          : 0)
                          ? C.green
                          : C.border
                      }
                    />
                    <Txt>{v}</Txt>
                  </Row>
                ))}
              </Card>
              {o.status === 'Ready for Pickup' && (
                <>
                  <Heading>Pickup OTP</Heading>
                  {config.mode === 'mock' && (
                    <Txt style={s.small}>
                      Explicit demo order · Test OTP: 4587 · No SMS sent.
                    </Txt>
                  )}
                  <Field
                    label="Enter rider's pickup code"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  <Button
                    disabled={busy || otp.length !== 4}
                    onPress={() =>
                      action('verify-pickup-otp', {
                        otp,
                      })
                    }
                  >
                    Verify OTP & Hand Over
                  </Button>
                </>
              )}
              {o.status === 'Preparing' && (
                <Button
                  onPress={() =>
                    nav('packing', {
                      id: o.id,
                    })
                  }
                >
                  Complete Packing First
                </Button>
              )}
              {o.status === 'Handed Over' && config.mode === 'mock' && (
                <Button
                  outline
                  disabled={busy}
                  onPress={() => action('deliver', {}, 'order')}
                >
                  Demo: Mark Delivered & Record Payment
                </Button>
              )}
              <DemoNote />
            </>
          );
        return (
          <>
            <Card>
              <Row>
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Heading>#{o.orderNumber}</Heading>
                  <Txt style={s.small}>{date(o.createdAt)}</Txt>
                </View>
                <Pill>{o.status}</Pill>
              </Row>
              <Heading>{o.customer.name}</Heading>
              <Txt
                onPress={() =>
                  Linking.openURL('tel:' + o.customer.phone).catch(e =>
                    notify(e.message),
                  )
                }
                style={{
                  color: C.purple,
                }}
              >
                {o.customer.phone}
              </Txt>
              <Txt style={s.small}>{o.address}</Txt>
            </Card>
            <Heading>Items</Heading>
            <Items o={o} />
            <Totals o={o} />
            <Card>
              <Txt
                style={{
                  fontWeight: '700',
                }}
              >
                Special Instructions
              </Txt>
              <Txt style={s.small}>{o.instructions}</Txt>
              <Txt>
                Payment: {o.paymentMethod} · {o.paymentStatus}
              </Txt>
            </Card>
            {o.customerResolution && (
              <Card>
                <Heading>Customer approval required</Heading>
                <Txt style={s.small}>{o.rejectionReason}</Txt>
                <Txt>
                  {typeof o.customerResolution === 'string'
                    ? o.customerResolution
                    : JSON.stringify(o.customerResolution)}
                </Txt>
              </Card>
            )}
            <Button
              outline
              onPress={() =>
                nav('receipt', {
                  id: o.id,
                })
              }
            >
              View Receipt
            </Button>
            {o.status === 'New' && (
              <>
                {reject ? (
                  <Card>
                    <Field
                      label="Reason for rejection *"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                    />
                    <Button
                      danger
                      disabled={busy || !reason.trim()}
                      onPress={() =>
                        action('reject', {
                          reason,
                        })
                      }
                    >
                      Reject Shop Segment
                    </Button>
                    <Button outline onPress={() => setReject(false)}>
                      Cancel
                    </Button>
                  </Card>
                ) : (
                  <Row>
                    <Button
                      outline
                      style={{
                        flex: 1,
                      }}
                      onPress={() => setReject(true)}
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={busy}
                      style={{
                        flex: 1,
                      }}
                      onPress={() => action('accept')}
                    >
                      Accept
                    </Button>
                  </Row>
                )}
              </>
            )}
            {o.status === 'Accepted' && (
              <Button
                disabled={busy}
                onPress={() => action('start-preparing', {}, 'preparation')}
              >
                Start Preparing
              </Button>
            )}
            {o.status === 'Preparing' && (
              <Button
                onPress={() =>
                  nav('preparation', {
                    id: o.id,
                  })
                }
              >
                Track Preparation
              </Button>
            )}
            {['Ready for Pickup', 'Handed Over', 'Delivered'].includes(
              o.status,
            ) && (
              <Button
                onPress={() =>
                  nav('rider', {
                    id: o.id,
                  })
                }
              >
                Rider & Handover
              </Button>
            )}
          </>
        );
      }}
    </Data>
  );
}
function Finance() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { route, nav, notify } = useApp(),
    q = useData('/earnings');
  const [period, setPeriod] = useState('Daily'),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [tab, setTab] = useState('Payment History'),
    [page, setPage] = useState(1);
  const reports = route.name === 'reports';
  return (
    <>
      <DemoNote />
      <Row>
        <View
          style={{
            flex: 1,
          }}
        >
          <Field
            label="From (YYYY-MM-DD)"
            value={from}
            onChangeText={v => {
              setFrom(v);
              setPage(1);
            }}
            placeholder="2026-11-01"
          />
        </View>
        <View
          style={{
            flex: 1,
          }}
        >
          <Field
            label="To (YYYY-MM-DD)"
            value={to}
            onChangeText={v => {
              setTo(v);
              setPage(1);
            }}
            placeholder="2026-11-30"
          />
        </View>
      </Row>
      {(from || to) && (
        <Button
          outline
          onPress={() => {
            setFrom('');
            setTo('');
          }}
        >
          Clear Dates
        </Button>
      )}
      <Data q={q}>
        {data => {
          const valid = v =>
            !v ||
            (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
              !Number.isNaN(Date.parse(v)) &&
              new Date(v).toISOString().slice(0, 10) === v);
          if (!valid(from) || !valid(to) || (from && to && from > to))
            return (
              <Card>
                <Txt
                  style={{
                    color: C.red,
                  }}
                >
                  Enter valid dates with the start date before the end date.
                </Txt>
              </Card>
            );
          const transactions = data.transactions.filter(
            t =>
              (!from || t.createdAt.slice(0, 10) >= from) &&
              (!to || t.createdAt.slice(0, 10) <= to),
          );
          const sum = key => transactions.reduce((n, t) => n + t[key], 0);
          const stats = reports
            ? [
                ['Total Sales', money(sum('amount'))],
                ['Total Orders', transactions.length],
                [
                  'Cancelled Orders',
                  data.orders.filter(
                    o =>
                      ['Rejected', 'Cancelled'].includes(o.status) &&
                      (!from || o.createdAt.slice(0, 10) >= from) &&
                      (!to || o.createdAt.slice(0, 10) <= to),
                  ).length,
                ],
              ]
            : [
                ['Total Sales', money(sum('amount'))],
                ['Shop Earnings', money(sum('settlementAmount'))],
                ['Platform Commission', money(sum('commission'))],
                [
                  'Pending Settlement',
                  money(
                    transactions
                      .filter(t => !t.settled)
                      .reduce((n, t) => n + t.settlementAmount, 0),
                  ),
                ],
              ];
          const chart = Array.from(
            {
              length: 7,
            },
            (_, i) => {
              const d = new Date();
              d.setUTCDate(
                d.getUTCDate() -
                  (6 - i) *
                    (period === 'Weekly' ? 7 : period === 'Monthly' ? 30 : 1),
              );
              const end = new Date(d);
              const start = new Date(d);
              start.setUTCDate(
                start.getUTCDate() -
                  (period === 'Weekly' ? 6 : period === 'Monthly' ? 29 : 0),
              );
              return {
                label:
                  period === 'Daily'
                    ? d.toLocaleDateString('en', {
                        weekday: 'short',
                      })
                    : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
                value: transactions
                  .filter(
                    t =>
                      t.createdAt.slice(0, 10) >=
                        start.toISOString().slice(0, 10) &&
                      t.createdAt.slice(0, 10) <=
                        end.toISOString().slice(0, 10),
                  )
                  .reduce((n, t) => n + t.amount, 0),
              };
            },
          );
          const exportData = async () => {
            try {
              await Share.share({
                title: 'ZestBasket demo sales',
                message:
                  'ZestBasket demo transactions\nDate,Order,Amount,Commission,Earnings,Settlement\n' +
                  transactions
                    .map(
                      t =>
                        `${t.createdAt.slice(0, 10)},${t.orderId},${t.amount},${
                          t.commission
                        },${t.settlementAmount},${
                          t.settled ? 'Settled' : 'Pending'
                        }`,
                    )
                    .join('\n'),
              });
            } catch (e) {
              notify(e.message);
            }
          };
          return (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                {stats.map(([label, value]) => (
                  <Card
                    key={label}
                    style={{
                      width: '48%',
                      marginBottom: 0,
                    }}
                  >
                    <Txt style={s.small}>{label}</Txt>
                    <Txt
                      style={{
                        fontSize: 20,
                        fontWeight: '800',
                        color: C.purple,
                        marginTop: 8,
                      }}
                    >
                      {value}
                    </Txt>
                  </Card>
                ))}
              </View>
              {reports || tab === 'Earnings Report' ? (
                <>
                  <Chips
                    values={['Daily', 'Weekly', 'Monthly']}
                    value={period}
                    onChange={setPeriod}
                  />
                  <Card>
                    <Heading>Sales Overview</Heading>
                    <Row
                      style={{
                        height: 175,
                        alignItems: 'flex-end',
                        justifyContent: 'space-around',
                      }}
                    >
                      {chart.map((v, i) => (
                        <View
                          key={i}
                          style={{
                            alignItems: 'center',
                            flex: 1,
                          }}
                        >
                          <Txt
                            style={{
                              fontSize: 8,
                            }}
                          >
                            {v.value}
                          </Txt>
                          <View
                            style={{
                              height: Math.max(
                                3,
                                (120 * v.value) /
                                  Math.max(...chart.map(c => c.value), 1),
                              ),
                              width: 19,
                              backgroundColor: C.purple,
                              borderTopLeftRadius: 5,
                              borderTopRightRadius: 5,
                            }}
                          />
                          <Txt
                            style={{
                              fontSize: 9,
                              marginTop: 8,
                            }}
                          >
                            {v.label}
                          </Txt>
                        </View>
                      ))}
                    </Row>
                  </Card>
                  <Heading>Best Selling Products</Heading>
                  {Object.values(
                    data.orders
                      .filter(
                        o =>
                          o.status === 'Delivered' &&
                          (!from || o.createdAt.slice(0, 10) >= from) &&
                          (!to || o.createdAt.slice(0, 10) <= to),
                      )
                      .flatMap(o => o.items)
                      .reduce((a, i) => {
                        a[i.productId] = {
                          name: i.name,
                          quantity:
                            (a[i.productId]?.quantity || 0) + i.quantity,
                        };
                        return a;
                      }, {}),
                  )
                    .sort((a, b) => b.quantity - a.quantity)
                    .map(i => (
                      <Card key={i.name}>
                        <Row>
                          <Txt
                            style={{
                              flex: 1,
                            }}
                          >
                            {i.name}
                          </Txt>
                          <Pill>{String(i.quantity) + ' sold'}</Pill>
                        </Row>
                      </Card>
                    ))}
                </>
              ) : null}
              {!reports && (
                <Chips
                  values={['Payment History', 'Earnings Report']}
                  value={tab}
                  onChange={setTab}
                />
              )}
              <Heading>
                {reports ? 'Sales Transactions' : 'Payment History'}
              </Heading>
              {transactions.slice((page - 1) * 8, page * 8).map(t => (
                <Card
                  key={t.id}
                  onPress={() =>
                    nav('order', {
                      id: t.orderId,
                    })
                  }
                >
                  <Row>
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Txt
                        style={{
                          fontWeight: '700',
                        }}
                      >
                        {t.orderId}
                      </Txt>
                      <Txt style={s.small}>
                        {date(t.createdAt)} · {t.paymentMethod}
                      </Txt>
                    </View>
                    <View>
                      <Txt>{money(t.amount)}</Txt>
                      <Pill>{t.settled ? 'Paid' : 'Pending'}</Pill>
                    </View>
                  </Row>
                </Card>
              ))}
              {!transactions.length && (
                <Empty
                  title="No transactions"
                  description="Demo deliveries will appear here."
                />
              )}
              {transactions.length > 8 && (
                <Row>
                  <Button
                    outline
                    disabled={page === 1}
                    style={{
                      flex: 1,
                    }}
                    onPress={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Txt>{page}</Txt>
                  <Button
                    outline
                    style={{
                      flex: 1,
                    }}
                    disabled={page * 8 >= transactions.length}
                    onPress={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </Row>
              )}
              <Button icon={Download} onPress={exportData}>
                Share CSV Report
              </Button>
            </>
          );
        }}
      </Data>
    </>
  );
}
function SettingsScreen() {
  const { nav, logout, notify } = useApp();
  return (
    <>
      <Heading>Your shop, your way.</Heading>
      <AppearanceControl onError={e => notify(e.message)} />
      <Card>
        {[
          ['Shop Profile', 'profile', Store],
          ['Manage Shop Status', 'status', CheckCircle2],
          ['Operating Hours', 'hours', Clock],
          ['Security & Account', 'security', ShieldCheck],
          ['Customer Support', 'support', Headphones],
          ['Earnings', 'earnings', Wallet],
          ['Sales Reports', 'reports', ChartColumn],
          ['Inventory History', 'history', History],
          ['Notifications', 'notifications', Bell],
        ].map(([title, name, Icon]) => (
          <LinkRow
            key={name}
            title={title}
            icon={Icon}
            onPress={() => nav(name)}
          />
        ))}
        <LinkRow title="Logout" icon={LogOut} onPress={logout} />
      </Card>
      <Logo />
    </>
  );
}
function Profile() {
  const s = useUiStyles();
  const { me, nav, act, busy } = useApp();
  const [f, setF] = useState({
    ...me.shop,
  });
  const set = k => v =>
    setF(x => ({
      ...x,
      [k]: v,
    }));
  return (
    <>
      <Card>
        <Row>
          <Avatar size={76} />
          <View
            style={{
              flex: 1,
            }}
          >
            <Heading>{me.shop.shopName}</Heading>
            <Pill>{me.shop.verificationStatus}</Pill>
            <Txt style={s.small}>Owner: {me.user.fullName}</Txt>
            <Txt style={s.small}>Phone: {me.user.phone}</Txt>
          </View>
        </Row>
      </Card>
      <Heading>Shop Details</Heading>
      <Field
        label="Shop Name"
        value={f.shopName}
        onChangeText={set('shopName')}
      />
      <Field
        label="Shop Address"
        multiline
        value={f.address}
        onChangeText={set('address')}
      />
      <Field
        label="Delivery Radius (km, maximum 5)"
        keyboardType="decimal-pad"
        value={f.deliveryRadiusKm}
        onChangeText={set('deliveryRadiusKm')}
      />
      <Txt style={s.small}>
        Service radius is separate from total route distance. Shop name changes
        need administrator verification.
      </Txt>
      <Button
        disabled={
          busy ||
          !f.shopName?.trim() ||
          !f.address?.trim() ||
          !Number.isFinite(Number(f.deliveryRadiusKm)) ||
          Number(f.deliveryRadiusKm) <= 0 ||
          Number(f.deliveryRadiusKm) > 5
        }
        onPress={async () => {
          try {
            if (f.shopName !== me.shop.shopName)
              await act(
                '/shop/verification',
                'POST',
                {
                  shopName: f.shopName,
                },
                'Name change submitted for review',
              );
            await act(
              '/shop/me',
              'PATCH',
              {
                address: f.address,
                deliveryRadiusKm: Number(f.deliveryRadiusKm),
              },
              'Profile saved',
            );
          } catch {}
        }}
      >
        Save Changes
      </Button>
      <Card>
        <LinkRow
          title="Operating Hours"
          subtitle="Set daily opening and closing times"
          icon={Clock}
          onPress={() => nav('hours')}
        />
        <LinkRow
          title="Shop Status"
          subtitle={me.shop.status}
          icon={Store}
          onPress={() => nav('status')}
        />
        <LinkRow
          title="Verification Documents"
          subtitle={me.shop.verificationStatus}
          icon={ShieldCheck}
          onPress={() => nav('verification')}
        />
      </Card>
    </>
  );
}
function Hours() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { me, act, busy } = useApp();
  const [hours, setHours] = useState(me.shop.workingHours),
    [holidays, setHolidays] = useState(
      Array.isArray(me.shop.holidays) ? me.shop.holidays.join(', ') : '',
    ),
    [error, setError] = useState('');
  const save = () => {
    const dates = holidays
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    if (
      dates.some(
        v =>
          !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          Number.isNaN(Date.parse(v)) ||
          new Date(v).toISOString().slice(0, 10) !== v,
      )
    ) {
      setError('Enter valid holiday dates separated by commas (YYYY-MM-DD).');
      return;
    }
    if (
      Object.values(hours).some(
        h =>
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.open) ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.close),
      )
    ) {
      setError('Use 24-hour times in HH:MM format.');
      return;
    }
    setError('');
    act(
      '/shop/hours',
      'PATCH',
      {
        workingHours: hours,
        holidays: dates,
      },
      'Operating hours saved',
    ).catch(() => {});
  };
  return (
    <>
      <Txt style={s.small}>Use 24-hour times, for example 08:00 to 23:00.</Txt>
      {Object.entries(hours).map(([day, h]) => (
        <Card key={day}>
          <Txt
            style={{
              fontWeight: '700',
              marginBottom: 8,
            }}
          >
            {day}
          </Txt>
          <Row>
            <View
              style={{
                flex: 1,
              }}
            >
              <Field
                label="Opens"
                value={h.open}
                onChangeText={v =>
                  setHours(x => ({
                    ...x,
                    [day]: {
                      ...x[day],
                      open: v,
                    },
                  }))
                }
              />
            </View>
            <View
              style={{
                flex: 1,
              }}
            >
              <Field
                label="Closes"
                value={h.close}
                onChangeText={v =>
                  setHours(x => ({
                    ...x,
                    [day]: {
                      ...x[day],
                      close: v,
                    },
                  }))
                }
              />
            </View>
          </Row>
        </Card>
      ))}
      <Field
        label="Holiday dates (YYYY-MM-DD, comma separated)"
        value={typeof holidays === 'string' ? holidays : holidays.join(', ')}
        onChangeText={setHolidays}
      />
      {error !== '' && (
        <Txt
          style={{
            color: C.red,
          }}
        >
          {error}
        </Txt>
      )}
      <Button disabled={busy} onPress={save}>
        Save Operating Hours
      </Button>
    </>
  );
}
function ShopStatus() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { me, nav, act, busy, setDialog } = useApp();
  const [value, setValue] = useState(me.shop.status),
    [edit, setEdit] = useState(false);
  const save = () =>
    act(
      '/shop/status',
      'PATCH',
      {
        status: value,
      },
      'Shop status updated',
    ).then(() => setEdit(false));
  return (
    <>
      <Heading>Current Status</Heading>
      <Row>
        {[
          ['active', 'Free', 'Accepting orders', C.green],
          ['busy', 'Busy', 'Limited orders', C.orange],
          ['closed', 'Closed', 'No new orders', C.red],
        ].map(([key, label, sub, color]) => (
          <Card
            key={key}
            onPress={() => {
              setValue(key);
              setEdit(true);
            }}
            style={{
              flex: 1,
              paddingHorizontal: 6,
              alignItems: 'center',
              borderColor: value === key ? color : C.border,
              backgroundColor: value === key ? color + '12' : C.surface,
            }}
          >
            <CheckCircle2 size={24} color={color} />
            <Txt
              style={{
                fontWeight: '700',
                color,
                marginVertical: 8,
              }}
            >
              {label}
            </Txt>
            <Txt
              style={{
                fontSize: 9,
                textAlign: 'center',
                color: C.muted,
              }}
            >
              {sub}
            </Txt>
          </Card>
        ))}
      </Row>
      {me.shop.status === 'closed' && !edit ? (
        <View
          style={{
            paddingVertical: 70,
            alignItems: 'center',
          }}
        >
          <Store size={66} color={C.red} />
          <Heading>Your shop is currently closed.</Heading>
          <Txt
            style={[
              s.small,
              {
                textAlign: 'center',
              },
            ]}
          >
            Customers won't be able to place orders.{'\n'}Existing orders remain
            available.
          </Txt>
          <Button
            style={{
              alignSelf: 'stretch',
              marginTop: 24,
            }}
            onPress={() => setEdit(true)}
          >
            Update Status
          </Button>
        </View>
      ) : (
        <>
          <Card>
            <Txt>
              {value === 'active'
                ? 'You are open and ready for fresh orders.'
                : value === 'busy'
                ? 'New assignments are limited to your shop capacity.'
                : 'New order assignments will be paused.'}
            </Txt>
          </Card>
          <Heading>Quick Actions</Heading>
          <Card>
            <LinkRow
              title="Edit Profile"
              icon={User}
              onPress={() => nav('profile')}
            />
            <LinkRow
              title="Operating Hours"
              icon={Clock}
              onPress={() => nav('hours')}
            />
            <LinkRow
              title="Help & Support"
              icon={Headphones}
              onPress={() => nav('support')}
            />
          </Card>
          <Button
            disabled={busy || value === me.shop.status}
            onPress={() =>
              value === 'closed'
                ? setDialog({
                    title: 'Close your shop?',
                    text: 'New assignments will stop. Please finish existing orders.',
                    confirm: 'Close Shop',
                    run: save,
                  })
                : save().catch(() => {})
            }
          >
            Save Changes
          </Button>
        </>
      )}
    </>
  );
}
function Security() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { nav, logout } = useApp();
  return (
    <>
      <Heading>Account Security</Heading>
      <Card>
        <LinkRow
          title="Change Password"
          subtitle="Secure your account"
          icon={ShieldCheck}
          onPress={() => nav('password')}
        />
        <Row
          style={{
            paddingVertical: 18,
          }}
        >
          <ShieldCheck color={C.purple} size={21} />
          <View
            style={{
              flex: 1,
            }}
          >
            <Txt>Two-Factor Authentication</Txt>
            <Txt style={s.small}>Coming soon · SMS service required</Txt>
          </View>
          <Switch disabled value={false} />
        </Row>
        <LinkRow
          title="Active Sessions"
          icon={Phone}
          onPress={() => nav('sessions')}
        />
      </Card>
      <Heading>Login Activity</Heading>
      <Sessions compact />
      <Heading>Danger Zone</Heading>
      <Card>
        <LinkRow title="Logout" icon={LogOut} onPress={logout} />
      </Card>
      <DemoNote />
    </>
  );
}
function Password() {
  const s = useUiStyles();
  const { act, busy, notify } = useApp();
  const [f, setF] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });
  const set = k => v =>
    setF(x => ({
      ...x,
      [k]: v,
    }));
  return (
    <>
      <Heading>Change Password</Heading>
      <Field
        label="Current Password"
        secret
        value={f.currentPassword}
        onChangeText={set('currentPassword')}
      />
      <Field
        label="New Password"
        secret
        value={f.newPassword}
        onChangeText={set('newPassword')}
      />
      <Field
        label="Confirm New Password"
        secret
        value={f.confirm}
        onChangeText={set('confirm')}
      />
      <Txt style={s.small}>
        At least 8 characters, with one letter and one number.
      </Txt>
      <Button
        disabled={busy}
        onPress={() => {
          if (
            !f.currentPassword ||
            !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.newPassword) ||
            f.confirm !== f.newPassword
          ) {
            notify('Check current password, strength and confirmation.');
            return;
          }
          act(
            '/auth/change-password',
            'POST',
            {
              currentPassword: f.currentPassword,
              newPassword: f.newPassword,
            },
            'Password changed',
          )
            .then(() =>
              setF({
                currentPassword: '',
                newPassword: '',
                confirm: '',
              }),
            )
            .catch(() => {});
        }}
      >
        Update Password
      </Button>
      <DemoNote />
      {config.mode === 'mock' && (
        <Txt style={s.small}>
          Connect a secure authentication backend to enable password changes.
          Demo mode does not save passwords.
        </Txt>
      )}
    </>
  );
}
function Sessions({ compact = false }) {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const q = useData('/auth/sessions'),
    { act } = useApp();
  return (
    <Data q={q}>
      {rows => (
        <>
          {rows.map(r => (
            <Card key={r.id}>
              <Row>
                <Phone color={C.purple} size={22} />
                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Txt>{r.device || r.userAgent || 'Device session'}</Txt>
                  <Txt style={s.small}>{date(r.createdAt)}</Txt>
                </View>
                <Pill>{r.current ? 'Current' : 'Active'}</Pill>
              </Row>
              {!r.current && !compact && (
                <Button
                  outline
                  onPress={() =>
                    act(
                      '/auth/sessions/' + r.id,
                      'DELETE',
                      undefined,
                      'Session revoked',
                    ).catch(() => {})
                  }
                >
                  Revoke Session
                </Button>
              )}
            </Card>
          ))}
        </>
      )}
    </Data>
  );
}
function Notifications() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { nav, act, busy } = useApp(),
    q = useData('/notifications');
  const [tab, setTab] = useState('All');
  return (
    <>
      <Row>
        <Heading>Stay in the loop</Heading>
        <View
          style={{
            flex: 1,
          }}
        />
        <Pressable
          disabled={busy}
          onPress={() =>
            act(
              '/notifications/read-all',
              'POST',
              {},
              'All notifications marked read',
            ).catch(() => {})
          }
        >
          <Txt
            style={{
              color: C.purple,
              fontSize: 12,
            }}
          >
            Mark all read
          </Txt>
        </Pressable>
      </Row>
      <Chips
        values={['All', 'Orders', 'System', 'Offers']}
        value={tab}
        onChange={setTab}
      />
      <Data q={q}>
        {rows => {
          const filtered = rows.filter(
            n => tab === 'All' || n.category === tab,
          );
          return filtered.length ? (
            filtered.map(n => (
              <Card
                key={n.id}
                onPress={async () => {
                  try {
                    await act('/notifications/' + n.id + '/read', 'PATCH', {});
                    if (n.orderId)
                      nav('order', {
                        id: n.orderId,
                      });
                    else if (n.title.toLowerCase().includes('payment'))
                      nav('earnings');
                    else nav('profile');
                  } catch {}
                }}
              >
                <Row>
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: C.tint,
                      borderRadius: 24,
                    }}
                  >
                    <Bell size={22} color={C.purple} />
                  </View>
                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Txt
                      style={{
                        fontWeight: n.read ? '400' : '700',
                      }}
                    >
                      {n.title}
                    </Txt>
                    <Txt style={s.small}>
                      {n.orderId} · {date(n.createdAt)}
                    </Txt>
                  </View>
                  {!n.read && (
                    <View
                      style={{
                        height: 7,
                        width: 7,
                        borderRadius: 7,
                        backgroundColor: C.red,
                      }}
                    />
                  )}
                </Row>
              </Card>
            ))
          ) : (
            <Empty
              title="All caught up"
              description="New notifications will appear here."
            />
          );
        }}
      </Data>
    </>
  );
}
function InventoryHistory() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const q = useData('/inventory/history');
  const [tab, setTab] = useState('All'),
    [page, setPage] = useState(1);
  return (
    <>
      <Chips
        values={['All', 'Added', 'Updated', 'Removed']}
        value={tab}
        onChange={v => {
          setTab(v);
          setPage(1);
        }}
      />
      <Data q={q}>
        {rows => {
          const list = [...rows]
            .filter(r => tab === 'All' || r.actionType === tab)
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
          return (
            <>
              {list.slice(0, page * 15).map(r => (
                <Card key={r.id}>
                  <Row>
                    <History
                      size={23}
                      color={r.actionType === 'Removed' ? C.red : C.green}
                    />
                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Txt
                        style={{
                          fontWeight: '700',
                        }}
                      >
                        {r.actionType}
                      </Txt>
                      <Txt
                        style={{
                          fontSize: 12,
                        }}
                      >
                        {r.productName}
                      </Txt>
                      <Txt style={s.small}>{date(r.timestamp)}</Txt>
                    </View>
                    <Pill>{`${r.previousQuantity} → ${r.newQuantity}`}</Pill>
                  </Row>
                </Card>
              ))}
              {!list.length && (
                <Empty
                  title="No history yet"
                  description="Inventory changes appear here automatically."
                />
              )}
              {list.length > page * 15 && (
                <Button outline onPress={() => setPage(p => p + 1)}>
                  Load More
                </Button>
              )}
              <Txt style={s.small}>
                Physical stock shown. Reserved stock remains unavailable until
                handover. Audit records cannot be edited.
              </Txt>
            </>
          );
        }}
      </Data>
    </>
  );
}
function Support() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { nav, act, busy, notify } = useApp(),
    q = useData('/support/tickets');
  const [tab, setTab] = useState('My Tickets'),
    [subject, setSubject] = useState(''),
    [description, setDescription] = useState(''),
    [issueType, setIssueType] = useState('General'),
    [attachment, setAttachment] = useState(''),
    [uploading, setUploading] = useState(false);
  return (
    <>
      <Heading>We're here to help.</Heading>
      <Txt style={s.small}>Your shop matters. Send us a message anytime.</Txt>
      <Chips
        values={['My Tickets', 'New Ticket']}
        value={tab}
        onChange={setTab}
      />
      {tab === 'My Tickets' ? (
        <>
          <Data q={q}>
            {rows =>
              rows.length ? (
                rows.map(t => (
                  <Card
                    key={t.id}
                    onPress={() =>
                      nav('ticket', {
                        id: t.id,
                      })
                    }
                  >
                    <Row>
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Txt
                          style={{
                            fontWeight: '700',
                            color: C.purple,
                          }}
                        >
                          #{t.id}
                        </Txt>
                        <Txt>{t.subject}</Txt>
                        <Txt style={s.small}>{date(t.createdAt)}</Txt>
                      </View>
                      <Pill>{t.status}</Pill>
                    </Row>
                  </Card>
                ))
              ) : (
                <Empty
                  title="No tickets yet"
                  description="Need a hand? Start a support ticket."
                  action="New Ticket"
                  onPress={() => setTab('New Ticket')}
                />
              )
            }
          </Data>
          <Button icon={Headphones} onPress={() => setTab('New Ticket')}>
            Contact Support
          </Button>
        </>
      ) : (
        <>
          <Txt style={s.label}>Issue Type</Txt>
          <Chips
            values={[
              'General',
              'Missing Item',
              'Wrong Product',
              'Order Issue',
              'Payments',
              'Operating Hours',
            ]}
            value={issueType}
            onChange={setIssueType}
          />
          <Field label="Subject *" value={subject} onChangeText={setSubject} />
          <Field
            label="Description * (at least 10 characters)"
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <Button
            outline
            icon={Camera}
            disabled={uploading}
            onPress={async () => {
              setUploading(true);
              try {
                const uri = await selectImage();
                if (uri) setAttachment(uri);
              } catch (e) {
                notify(e.message);
              } finally {
                setUploading(false);
              }
            }}
          >
            {uploading
              ? 'Loading image…'
              : attachment
              ? 'Replace Attachment'
              : 'Attach Image (Optional)'}
          </Button>
          {attachment !== '' && (
            <Card>
              <ProductImage
                product={{
                  imageUrl: attachment,
                }}
              />
              <Button outline onPress={() => setAttachment('')}>
                Remove Attachment
              </Button>
            </Card>
          )}
          <Button
            disabled={
              busy ||
              uploading ||
              subject.trim().length < 3 ||
              description.trim().length < 10
            }
            onPress={async () => {
              try {
                await act(
                  '/support/tickets',
                  'POST',
                  {
                    subject,
                    description,
                    issueType,
                    attachment: attachment || undefined,
                  },
                  'Ticket submitted',
                );
                setSubject('');
                setDescription('');
                setAttachment('');
                setTab('My Tickets');
              } catch {}
            }}
          >
            Submit Ticket
          </Button>
        </>
      )}
    </>
  );
}
function Ticket() {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const { route, act, busy } = useApp(),
    q = useData('/support/tickets/' + route.id + '/messages'),
    tickets = useData('/support/tickets');
  const [reply, setReply] = useState('');
  return (
    <>
      <Heading>#{route.id}</Heading>
      {tickets.data?.find(t => t.id === route.id)?.attachment && (
        <Card>
          <Txt style={s.label}>Attached Image</Txt>
          <ProductImage
            product={{
              imageUrl: tickets.data.find(t => t.id === route.id).attachment,
            }}
          />
        </Card>
      )}
      <Data q={q}>
        {rows =>
          rows.map(m => (
            <Card
              key={m.id}
              style={{
                backgroundColor: m.author === 'You' ? C.tint : C.surface,
              }}
            >
              <Txt
                style={{
                  fontWeight: '700',
                }}
              >
                {m.author}
              </Txt>
              <Txt
                style={{
                  marginVertical: 8,
                }}
              >
                {m.body}
              </Txt>
              <Txt style={s.small}>{date(m.createdAt)}</Txt>
            </Card>
          ))
        }
      </Data>
      <Field
        label="Your Reply"
        multiline
        value={reply}
        onChangeText={setReply}
      />
      <Button
        disabled={busy || !reply.trim()}
        onPress={async () => {
          try {
            await act(
              '/support/tickets/' + route.id + '/messages',
              'POST',
              {
                body: reply,
              },
              'Reply sent',
            );
            setReply('');
          } catch {}
        }}
      >
        Send Reply
      </Button>
      <Txt style={s.small}>
        Replies from support require your connected backend; no simulated
        support agent.
      </Txt>
    </>
  );
}
function Rewards({ compact = false }) {
  const { colors: C } = useTheme();
  const s = useUiStyles();
  const q = useData('/rewards'),
    { nav } = useApp();
  return (
    <Data q={q}>
      {data => (
        <>
          <Card>
            <Row>
              <IconBadge icon={Award} />
              <Heading>Golden Points</Heading>
            </Row>
            <Txt
              style={{
                fontSize: 26,
                fontWeight: '800',
                color: C.orange,
              }}
            >
              {data.points} / 50
            </Txt>
            <View
              style={{
                height: 9,
                backgroundColor: C.tint,
                borderRadius: 10,
                marginVertical: 15,
              }}
            >
              <View
                style={{
                  height: 9,
                  width: Math.min((data.points / 50) * 100, 100) + '%',
                  backgroundColor: C.orange,
                  borderRadius: 10,
                }}
              />
            </View>
            <Txt style={s.small}>
              Reach 50 points to unlock the Golden Badge!
            </Txt>
          </Card>
          {compact ? (
            <Button outline onPress={() => nav('rewards')}>
              View Points History
            </Button>
          ) : data.history.length ? (
            data.history.map(r => (
              <Card key={r.id}>
                <Txt>
                  +{r.points} points · {r.orderId}
                </Txt>
                <Txt style={s.small}>{date(r.createdAt)}</Txt>
              </Card>
            ))
          ) : (
            <Txt style={s.small}>
              Your starting balance is 48 demo points. Complete a handover to
              earn more.
            </Txt>
          )}
        </>
      )}
    </Data>
  );
}
function Verification() {
  const s = useUiStyles();
  const { me, nav, act, busy, notify } = useApp();
  const q = useData('/shop/verification');
  const [document, setDocument] = useState(''),
    [uploading, setUploading] = useState(false);
  return (
    <>
      <Card>
        <Heading>Shop Verification</Heading>
        <Pill>{me.shop.verificationStatus}</Pill>
        <Txt
          style={[
            s.small,
            {
              marginTop: 16,
            },
          ]}
        >
          Administrator review is required for approval. Documents are not sent
          to any external party in local demo mode.
        </Txt>
      </Card>
      <Button
        outline
        icon={Camera}
        disabled={uploading}
        onPress={async () => {
          setUploading(true);
          try {
            const uri = await selectImage();
            if (uri) setDocument(uri);
          } catch (e) {
            notify(e.message);
          } finally {
            setUploading(false);
          }
        }}
      >
        {uploading
          ? 'Loading image…'
          : document
          ? 'Replace Document'
          : 'Choose Verification Document'}
      </Button>
      {document !== '' && (
        <Card>
          <ProductImage
            product={{
              imageUrl: document,
            }}
          />
          <Txt style={s.small}>
            Document selected. Submit to request administrator review.
          </Txt>
        </Card>
      )}
      <Button
        disabled={busy || uploading || !document}
        onPress={() =>
          act(
            '/shop/verification',
            'POST',
            {
              shopName: me.shop.shopName,
              document,
            },
            'Submitted for administrator review',
          )
            .then(() => setDocument(''))
            .catch(() => {})
        }
      >
        Submit Verification Request
      </Button>
      <Data q={q}>
        {data =>
          data.requests.map(r => (
            <Card key={r.id}>
              <Row>
                <Txt
                  style={{
                    flex: 1,
                  }}
                >
                  {r.shopName}
                </Txt>
                <Pill>{r.status}</Pill>
              </Row>
              <Txt style={s.small}>{date(r.createdAt)}</Txt>
            </Card>
          ))
        }
      </Data>
      <Button onPress={() => nav('support')}>
        Contact Support for Verification
      </Button>
    </>
  );
}
const createStyles = C =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: C.bg,
    },
    header: {
      minHeight: 60,
      paddingHorizontal: 17,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderBottomWidth: 1,
      borderColor: C.border,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    nav: {
      height: 66,
      flexDirection: 'row',
      borderTopWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    overlay: {
      flex: 1,
      backgroundColor: C.overlay,
    },
    modal: {
      backgroundColor: C.surface,
      padding: 22,
      borderRadius: 20,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    drawer: {
      backgroundColor: C.surface,
      width: '85%',
      maxWidth: 370,
      height: '100%',
      padding: 20,
    },
    toast: {
      position: 'absolute',
      bottom: 85,
      left: 20,
      right: 20,
      padding: 16,
      backgroundColor: C.primary,
      borderRadius: 13,
      elevation: 10,
    },
  });
