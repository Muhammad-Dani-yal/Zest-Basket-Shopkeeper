import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck,
  LoaderCircle,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Sun,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Logo, Modal, TopBar, useApp } from '../../components/ui';
import { api, qc, type Row } from '../../services/api';

export function Welcome() {
  const { me } = useApp();
  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-art" />
        <div className="welcome-brand">
          <Logo small />
          <Sun size={22} />
        </div>
        <div className="welcome-copy">
          <span className="eyebrow">YOUR SHOP. YOUR SUCCESS.</span>
          <h1>
            Welcome,
            <br />
            Shopkeeper!
          </h1>
          <p>
            Manage your shop, inventory
            <br />
            and orders — all in one place.
          </p>
        </div>
      </div>
      <div className="welcome-bottom">
        <span className="tiny-label">LET'S GROW TOGETHER</span>
        <h2>A fresh start for your shop.</h2>
        <Link className="btn gradient" to="/register">
          Register Your Shop <ChevronRight size={18} />
        </Link>
        <Link className="btn outline" to="/login">
          Login
        </Link>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
        {me && <Link to="/dashboard">Continue to Dashboard →</Link>}
      </div>
    </div>
  );
}
const authSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+92|92|0)?3\d{9}$/, 'Enter a valid Pakistani mobile number'),
  password: z.string().min(8, 'At least 8 characters'),
});
const registerSchema = authSchema
  .extend({
    fullName: z.string().min(2, 'Enter your full name'),
    cnic: z.string().regex(/^\d{5}-\d{7}-\d$/, 'Use XXXXX-XXXXXXX-X'),
    password: z
      .string()
      .min(8)
      .regex(/[A-Za-z]/, 'Include a letter')
      .regex(/\d/, 'Include a number'),
    confirm: z.string(),
    shopName: z.string().min(2, 'Enter shop name'),
    address: z.string().min(8, 'Enter a complete address'),
  })
  .refine(v => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });
export function Auth({ registerMode = false }: { registerMode?: boolean }) {
  const { notify } = useApp(),
    nav = useNavigate(),
    [visible, setVisible] = useState(false),
    [recovery, setRecovery] = useState(false),
    [recoverPhone, setRecoverPhone] = useState(''),
    [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Row>({
    resolver: zodResolver(registerMode ? registerSchema : authSchema),
  });
  const submit = async (b: Row) => {
    try {
      const data = await api(
        registerMode ? '/auth/register' : '/auth/login',
        'POST',
        b,
      );
      await qc.invalidateQueries({ queryKey: ['/auth/me'] });
      notify(registerMode ? data.message : 'Welcome back!');
      nav(registerMode ? '/login' : '/dashboard');
    } catch (e: any) {
      notify(e.message);
    }
  };
  const field = (
    name: string,
    label: string,
    Icon: any,
    type = 'text',
    placeholder = '',
  ) => (
    <label className="field">
      <span>{label} *</span>
      <div className="input-wrap">
        <Icon size={17} />
        {name === 'phone' && <span className="country">🇵🇰 +92</span>}
        <input
          type={type === 'password' && visible ? 'text' : type}
          placeholder={placeholder}
          autoComplete={
            name === 'password'
              ? registerMode
                ? 'new-password'
                : 'current-password'
              : name === 'phone'
              ? 'tel'
              : 'off'
          }
          {...register(name)}
        />
        {type === 'password' && (
          <button
            type="button"
            aria-label="Toggle password visibility"
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {errors[name] && (
        <small className="danger">{String(errors[name]?.message)}</small>
      )}
    </label>
  );
  return (
    <>
      <TopBar title={registerMode ? 'Register Your Shop' : 'Welcome back'} />
      <div
        className={'page auth-page ' + (registerMode ? 'register-page' : '')}
      >
        {!registerMode && <Logo />}
        {registerMode ? (
          <>
            <h2>Register Your Shop</h2>
            <p className="muted">
              Start your journey with ZestBasket
              <br />
              and grow your business.
            </p>
          </>
        ) : (
          <>
            <h2>Shopkeeper Login</h2>
            <p className="muted">Good to see you. Let's get to business.</p>
          </>
        )}
        <form onSubmit={handleSubmit(submit)}>
          {registerMode && (
            <>
              <h3 className="section-label">Shop Owner Details</h3>
              {field(
                'fullName',
                'Full Name',
                User,
                'text',
                'Enter your full name',
              )}
              {field(
                'cnic',
                'CNIC Number',
                FileCheck,
                'text',
                'XXXXX-XXXXXXX-X',
              )}
            </>
          )}
          {field('phone', 'Phone Number', Phone, 'tel', '03001234567')}
          {field(
            'password',
            'Password',
            Lock,
            'password',
            registerMode ? 'Create a strong password' : 'Enter your password',
          )}
          {registerMode && (
            <>
              {field(
                'confirm',
                'Confirm Password',
                Lock,
                'password',
                'Re-enter your password',
              )}
              <h3 className="section-label">Shop Details</h3>
              {field(
                'shopName',
                'Shop Name',
                Store,
                'text',
                'Enter your shop name',
              )}
              {field(
                'address',
                'Shop Address',
                MapPin,
                'text',
                'Enter shop address',
              )}
            </>
          )}
          <Button kind="gradient full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="spin" size={18} />
            ) : registerMode ? (
              'Register Your Shop'
            ) : (
              'Login'
            )}
          </Button>
        </form>
        {!registerMode && (
          <button
            className="text-button forgot"
            onClick={() => setRecovery(true)}
          >
            Forgot Password?
          </button>
        )}
        <p className="auth-footer">
          {registerMode ? 'Already have an account?' : 'New shop?'}{' '}
          <Link to={registerMode ? '/login' : '/register'}>
            {registerMode ? 'Login' : 'Register Your Shop'}
          </Link>
        </p>
        {!registerMode && (
          <Button
            kind="outline full demo-login"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/auth/demo', 'POST');
                await qc.invalidateQueries({ queryKey: ['/auth/me'] });
                nav('/dashboard');
              } catch (e: any) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Demo Login (For Testing)
          </Button>
        )}
        <p className="secure-note">
          <ShieldCheck size={14} /> Your shop, securely connected.
        </p>
      </div>
      {recovery && (
        <Modal title="Recover your account" onClose={() => setRecovery(false)}>
          <p className="muted">
            Enter your registered number to request recovery support.
          </p>
          <form
            onSubmit={async e => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await api('/auth/recover-password', 'POST', {
                  phone: recoverPhone,
                });
                notify(r.message);
                setRecovery(false);
              } catch (e: any) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Phone number
              <input
                required
                type="tel"
                value={recoverPhone}
                onChange={e => setRecoverPhone(e.target.value)}
              />
            </label>
            <Button type="submit" kind="full" disabled={busy}>
              Request Recovery
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
