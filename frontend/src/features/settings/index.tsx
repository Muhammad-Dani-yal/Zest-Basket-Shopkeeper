import {
  Bell,
  ChartColumn,
  ChevronRight,
  Clock,
  Headphones,
  History,
  Home,
  Lock,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Logo,
  Modal,
  QueryView,
  RowLink,
  TopBar,
  useApp,
} from '../../components/ui';
import { date, useData, type Row } from '../../services/api';

export function Security() {
  const { me, mutate, logout } = useApp(),
    q = useData('/auth/sessions'),
    [modal, setModal] = useState(''),
    [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Row>();
  return (
    <>
      <TopBar title="Security & Account" />
      <div className="page">
        <h3 className="section-label">Account Security</h3>
        <Card className="settings-card">
          <RowLink
            title="Change Password"
            sub="Keep your account secure"
            icon={Lock}
            onClick={() => {
              reset();
              setModal('password');
            }}
          />
          <div className="row-link">
            <span className="row-icon">
              <ShieldCheck size={20} />
            </span>
            <span className="row-copy">
              <strong>Two-Factor Authentication</strong>
              <small>Coming Soon</small>
            </span>
            <input
              aria-label="Two-factor authentication coming soon"
              type="checkbox"
              disabled
            />
          </div>
          <RowLink
            title="Active Sessions"
            sub={(q.data?.length || 0) + ' devices'}
            icon={ShieldCheck}
            onClick={() => setModal('sessions')}
          />
        </Card>
        <h3 className="section-label">Login Activity</h3>
        <Card>
          {q.data?.length ? (
            <>
              <p className="small">
                Last Login: {date(q.data.at(-1).createdAt)}
              </p>
              <p className="muted small device-label">
                Device: {q.data.at(-1).device}
              </p>
            </>
          ) : (
            <p className="muted">Fetching login activity...</p>
          )}
        </Card>
        <h3 className="section-label danger">Danger Zone</h3>
        <Card className="settings-card">
          <RowLink
            title="Logout"
            icon={LogOut}
            onClick={() => setModal('logout')}
          />
        </Card>
        <p className="secure-note">
          <ShieldCheck size={14} /> Signed in as {me.user.phone}
        </p>
      </div>
      {modal && (
        <Modal
          title={
            modal === 'password'
              ? 'Change Password'
              : modal === 'sessions'
              ? 'Active Sessions'
              : 'Logout?'
          }
          onClose={() => setModal('')}
        >
          {modal === 'password' ? (
            <form
              onSubmit={handleSubmit(async b => {
                try {
                  await mutate(
                    '/auth/change-password',
                    b,
                    'POST',
                    'Password changed',
                  );
                  setModal('');
                } catch {}
              })}
            >
              <label className="field">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  {...register('currentPassword')}
                />
              </label>
              <label className="field">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword', {
                    required: true,
                    minLength: 8,
                    validate: v => /[a-z]/i.test(v) && /\d/.test(v),
                  })}
                />
                <small className={errors.newPassword ? 'danger' : 'muted'}>
                  At least 8 characters with a letter and number
                </small>
              </label>
              <Button type="submit" kind="full" disabled={isSubmitting}>
                Update Password
              </Button>
            </form>
          ) : modal === 'sessions' ? (
            <QueryView query={q}>
              {(sessions: Row[]) =>
                sessions.map(s => (
                  <Card key={s.id}>
                    <h3>{s.current ? 'Current device' : 'Other device'}</h3>
                    <p className="muted small device-label">{s.device}</p>
                    <small>{date(s.createdAt)}</small>
                    {!s.current && (
                      <Button
                        disabled={busy}
                        kind="danger-outline full"
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await mutate(
                              '/auth/sessions/' + s.id,
                              undefined,
                              'DELETE',
                              'Session revoked',
                            );
                          } catch {
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Revoke Session
                      </Button>
                    )}
                  </Card>
                ))
              }
            </QueryView>
          ) : (
            <>
              <p className="muted">
                You'll need to log in to manage your shop again.
              </p>
              <div className="actions">
                <Button kind="outline" onClick={() => setModal('')}>
                  Cancel
                </Button>
                <Button kind="danger-btn" onClick={logout}>
                  Logout
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
export function SettingsPage() {
  const { me, logout } = useApp();
  return (
    <>
      <TopBar title="Settings" />
      <div className="page">
        <Link className="card settings-profile" to="/shop/profile">
          <Avatar />
          <div>
            <h2>{me.shop.shopName}</h2>
            <p className="muted">{me.user.fullName} · Shopkeeper</p>
          </div>
          <ChevronRight size={20} />
        </Link>
        <h3 className="section-label">Your Shop</h3>
        <Card className="settings-card">
          {[
            ['Shop Profile', '/shop/profile', Store],
            ['Manage Shop Status', '/shop/status', SlidersHorizontal],
            ['Operating Hours', '/shop/profile?edit=hours', Clock],
            ['Security & Account', '/security', ShieldCheck],
          ].map(([title, to, Icon]: any) => (
            <RowLink key={title} title={title} to={to} icon={Icon} />
          ))}
        </Card>
        <h3 className="section-label">Business & Support</h3>
        <Card className="settings-card">
          {[
            ['Earnings', '/earnings', Wallet],
            ['Sales Reports', '/reports', ChartColumn],
            ['Inventory History', '/inventory/history', History],
            ['Notifications', '/notifications', Bell],
            ['Customer Support', '/support', Headphones],
          ].map(([title, to, Icon]: any) => (
            <RowLink key={title} title={title} to={to} icon={Icon} />
          ))}
        </Card>
        <Button kind="danger-outline full" onClick={logout}>
          <LogOut size={17} /> Logout
        </Button>
        <div className="settings-brand">
          <Logo small />
          <small>Made for your local shop. Version 1.0</small>
        </div>
      </div>
    </>
  );
}
export function Branding() {
  return (
    <div className="branding">
      <nav>
        {[
          [Home, 'Home'],
          [ShoppingBag, 'Orders'],
          [Package, 'Inventory'],
          [Settings, 'Settings'],
        ].map(([Icon, label]: any) => (
          <Link
            key={label}
            to={'/' + (label === 'Home' ? 'dashboard' : label.toLowerCase())}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
      <Logo />
      <h2>Manage. Grow. Succeed.</h2>
      <p>Your Local Shop, Our Priority.</p>
      <div className="branding-produce">🥬 🍅 🥕 🫑 🥦</div>
      <Link to="/welcome" className="btn outline">
        Welcome to ZestBasket
      </Link>
    </div>
  );
}
