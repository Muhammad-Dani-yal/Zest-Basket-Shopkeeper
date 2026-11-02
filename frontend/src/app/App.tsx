import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, LogOut, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Avatar,
  BottomNav,
  Ctx,
  Empty,
  ErrorState,
  Loading,
  Logo,
  menuLinks,
  Pill,
  RowLink,
  TopBar,
} from '../components/ui';
import { Auth, Welcome } from '../features/auth';
import { Dashboard } from '../features/dashboard';
import { Finance } from '../features/finance';
import {
  Inventory,
  InventoryHistory,
  ProductForm,
} from '../features/inventory';
import { Notifications } from '../features/notifications';
import { Order, Orders } from '../features/orders';
import { Branding, Security, SettingsPage } from '../features/settings';
import { Profile, ShopStatus } from '../features/shop';
import { Support } from '../features/support';
import { api, qc } from '../services/api';

export function App() {
  const [toast, setToast] = useState(''),
    [drawer, setDrawer] = useState(false);
  const me = useQuery({
    queryKey: ['/auth/me'],
    queryFn: () => api('/auth/me'),
    retry: false,
  });
  const nav = useNavigate();
  const location = useLocation();
  const publicPage = ['/welcome', '/login', '/register', '/branding'].includes(
    location.pathname,
  );
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!me.data) return;
    const socket = io({ withCredentials: true });
    [
      'order:new',
      'order:status',
      'inventory:updated',
      'rider:assigned',
      'payment:updated',
      'notification:new',
      'shop:status',
    ].forEach(event => socket.on(event, () => qc.invalidateQueries()));
    return () => {
      socket.disconnect();
    };
  }, [me.data?.user?.id]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawer(false);
  }, [location.pathname]);
  const logout = async () => {
    try {
      await api('/auth/logout', 'POST');
      qc.clear();
      nav('/login');
    } catch (e: any) {
      notify(e.message);
    }
  };
  const mutate = async (
    path: string,
    body?: any,
    method = 'POST',
    success = 'Changes saved',
  ) => {
    try {
      const result = await api(path, method, body);
      await qc.invalidateQueries();
      if (success) notify(success);
      return result;
    } catch (e: any) {
      notify(e.message);
      throw e;
    }
  };
  if (me.isPending && !publicPage) return <Loading />;
  if (!publicPage && !me.data) {
    if ((me.error as any)?.status === 401)
      return <Navigate to="/login" replace />;
    return <ErrorState error={me.error} retry={() => me.refetch()} />;
  }
  return (
    <Ctx.Provider value={{ me: me.data, notify, mutate, logout, setDrawer }}>
      <div className={'app-frame ' + (publicPage ? 'auth-frame' : '')}>
        <aside className="desktop-sidebar">
          <Logo small />
          <div className="sidebar-shop">
            <Avatar />
            <div>
              <strong>
                {me.data?.shop?.shopName || 'Your shop, simplified.'}
              </strong>
              <small>
                {me.data
                  ? 'Shopkeeper workspace'
                  : 'Fresh Groceries, Happier Homes'}
              </small>
            </div>
          </div>
          <nav>
            {menuLinks.map(([label, to, Icon]: any) => (
              <NavLink key={to} to={me.data ? to : '/login'}>
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="live-dot" /> Made for your everyday hustle
            <small>ZestBasket Shopkeeper Portal</small>
          </div>
        </aside>
        <main className="phone-content">
          <Routes>
            <Route
              path="/"
              element={
                <Navigate to={me.data ? '/dashboard' : '/welcome'} replace />
              }
            />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth registerMode />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/add" element={<ProductForm />} />
            <Route path="/inventory/:id/edit" element={<ProductForm />} />
            <Route path="/inventory/history" element={<InventoryHistory />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id/*" element={<Order />} />
            <Route path="/earnings" element={<Finance />} />
            <Route path="/reports" element={<Finance reports />} />
            <Route path="/support" element={<Support />} />
            <Route path="/shop/profile" element={<Profile />} />
            <Route path="/shop/status" element={<ShopStatus />} />
            <Route path="/security" element={<Security />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/branding" element={<Branding />} />
            <Route
              path="*"
              element={
                <>
                  <TopBar title="Page not found" />
                  <Empty
                    title="Let's get you back"
                    description="This page doesn't exist."
                    action="Go Home"
                    onClick={() => nav('/dashboard')}
                  />
                </>
              }
            />
          </Routes>
          {!publicPage && <BottomNav />}
        </main>
        {drawer && (
          <div
            className="overlay drawer-overlay"
            onClick={() => setDrawer(false)}
          >
            <aside className="drawer" onClick={e => e.stopPropagation()}>
              <button
                className="close"
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
              >
                <X />
              </button>
              <Avatar />
              <h2>{me.data?.shop?.shopName}</h2>
              <Pill>{me.data?.shop?.verificationStatus}</Pill>
              {menuLinks.map(([label, to, Icon]: any) => (
                <RowLink key={to} title={label} to={to} icon={Icon} />
              ))}
              <RowLink title="Logout" icon={LogOut} onClick={logout} />
            </aside>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={18} />
            {toast}
            <button
              onClick={() => setToast('')}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
