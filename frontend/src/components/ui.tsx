import { Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  ChartColumn,
  ChevronRight,
  Headphones,
  Home,
  Leaf,
  LoaderCircle,
  Package,
  Settings,
  ShoppingBag,
  ShoppingBasket,
  SlidersHorizontal,
  Store,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { money, type Row } from '../services/api';

export const Ctx = createContext<any>(null);
export const useApp = () => useContext(Ctx);
export function Button({
  children,
  onClick,
  kind = '',
  type = 'button',
  disabled = false,
  ...props
}: any) {
  return (
    <button
      type={type}
      className={'btn ' + kind}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={'card ' + className}>{children}</section>;
}
export function Pill({ children }: { children: ReactNode }) {
  const t = String(children);
  return (
    <span
      className={
        'pill ' +
        (['New', 'Busy', 'Pending', 'Unpaid', 'Low Stock'].includes(t)
          ? 'orange'
          : ['Rejected', 'Cancelled', 'Closed', 'Unavailable'].includes(t)
          ? 'red'
          : ['In Progress', 'Preparing', 'Accepted'].includes(t)
          ? 'blue'
          : 'green')
      }
    >
      {children}
    </span>
  );
}
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={'logo ' + (small ? 'small' : '')}>
      <div className="basket-mark">
        <Leaf />
        <ShoppingBasket />
      </div>
      <strong>
        Zest<span>Basket</span>
      </strong>
      <small>Fresh Groceries, Happier Homes</small>
    </div>
  );
}
export function Avatar({ rider = false }: { rider?: boolean }) {
  return (
    <span
      className={'avatar ' + (rider ? 'rider' : '')}
      aria-label={rider ? 'Delivery rider' : 'Shopkeeper'}
    >
      {rider ? '🧑🏽‍✈️' : <span />}
    </span>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={34} />
      <h3>Loading...</h3>
      <p>Please wait while we fetch data.</p>
    </div>
  );
}
export function ErrorState({ error, retry }: any) {
  return (
    <div className="state" role="alert">
      <WifiOff size={44} className="danger" />
      <h3>Network Error</h3>
      <p>{error?.message || 'Check your internet connection and try again.'}</p>
      <Button onClick={retry}>Retry</Button>
    </div>
  );
}
export function Empty({ title, description, action, onClick }: any) {
  return (
    <div className="state">
      <div className="empty-icon">
        <Package size={52} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Button onClick={onClick}>{action}</Button>
    </div>
  );
}
export function QueryView({ query, children }: any) {
  if (query.isPending) return <Loading />;
  if ((query.error as any)?.status === 401)
    return <Navigate to="/login" replace />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  return children(query.data);
}
export function TopBar({ title, action, onBack }: any) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      <button aria-label="Go back" onClick={onBack || (() => nav(-1))}>
        <ArrowLeft size={21} />
      </button>
      <h1>{title}</h1>
      {action || <span />}
    </header>
  );
}
export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {[
        ['/dashboard', 'Home', Home],
        ['/orders', 'Orders', ShoppingBag],
        ['/inventory', 'Inventory', Package],
        ['/settings', 'Settings', Settings],
      ].map(([to, label, Icon]: any) => (
        <NavLink key={to} to={to}>
          <Icon size={21} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
export const menuLinks = [
  ['Dashboard', '/dashboard', Home],
  ['Orders', '/orders', ShoppingBag],
  ['Inventory', '/inventory', Package],
  ['Earnings', '/earnings', Wallet],
  ['Sales Reports', '/reports', ChartColumn],
  ['Shop Profile', '/shop/profile', Store],
  ['Shop Status', '/shop/status', SlidersHorizontal],
  ['Support', '/support', Headphones],
  ['Notifications', '/notifications', Bell],
  ['Settings', '/settings', Settings],
];
export function RowLink({
  to,
  icon: Icon = ChevronRight,
  title,
  sub,
  action,
  onClick,
}: any) {
  const content = (
    <>
      <span className="row-icon">
        <Icon size={19} />
      </span>
      <span className="row-copy">
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {action || <ChevronRight size={17} />}
    </>
  );
  return to ? (
    <Link className="row-link" to={to}>
      {content}
    </Link>
  ) : (
    <button className="row-link" onClick={onClick}>
      {content}
    </button>
  );
}
export function Modal({ title, children, onClose }: any) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector('.modal') as HTMLElement;
    const items = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,a[href]',
        ) || [],
      ).filter(x => !x.hasAttribute('disabled'));
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const a = items(),
          first = a[0],
          last = a.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button className="close" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
export function OrderCard({
  order: o,
  compact = false,
}: {
  order: Row;
  compact?: boolean;
}) {
  const { mutate } = useApp(),
    [reject, setReject] = useState(false),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false);
  const action = async (a: string, b?: any) => {
    setBusy(true);
    try {
      await mutate('/orders/' + o.id + '/' + a, b, 'POST', 'Order updated');
      setReject(false);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Card className="order-card">
        <div className="order-card-top">
          {!compact && (
            <div className="product-mini">{o.items[0]?.emoji || '🛒'}</div>
          )}
          <div className="grow">
            <Link className="order-number" to={'/orders/' + o.id}>
              #{o.orderNumber}
            </Link>
            <small className="muted">{o.customer.name}</small>
          </div>
          <div className="order-time">
            <small>
              {new Date(o.createdAt).toLocaleTimeString('en-PK', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </small>
            <Pill>{o.status}</Pill>
          </div>
        </div>
        <div className="order-meta">
          <span>{o.items.length} items</span>
          <strong>{money(o.total)}</strong>
        </div>
        {!compact && (
          <div className="order-thumbs">
            {o.items.map((i: Row) => (
              <span key={i.productId}>{i.emoji || '🛍️'}</span>
            ))}
            <Link to={'/orders/' + o.id}>
              View Details <ChevronRight size={12} />
            </Link>
          </div>
        )}
        <div className="actions">
          {o.status === 'New' ? (
            <>
              <Button
                kind="danger-outline"
                disabled={busy}
                onClick={() => setReject(true)}
              >
                Reject
              </Button>
              <Button
                kind="gradient"
                disabled={busy}
                onClick={() => action('accept')}
              >
                Accept
              </Button>
            </>
          ) : o.status === 'Accepted' ? (
            <Button disabled={busy} onClick={() => action('start-preparing')}>
              Start Preparing
            </Button>
          ) : null}
          <Link
            className="btn outline"
            to={
              '/orders/' +
              o.id +
              (o.status === 'Preparing' ? '/preparation' : '')
            }
          >
            {o.status === 'Preparing' ? 'View Packing' : 'View Details'}
          </Link>
        </div>
      </Card>
      {reject && (
        <Modal
          title="Reject this shop's order?"
          onClose={() => setReject(false)}
        >
          <p className="muted">
            Only your shop's items are affected. The customer can approve a
            switch or remove these items.
          </p>
          <label className="field">
            Reason
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Tell the customer why (at least 5 characters)"
            />
          </label>
          <div className="actions">
            <Button kind="outline" onClick={() => setReject(false)}>
              Cancel
            </Button>
            <Button
              kind="danger-btn"
              disabled={reason.trim().length < 5 || busy}
              onClick={() => action('reject', { reason })}
            >
              Reject Order
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function ProductImage({ product: p }: { product: Row }) {
  return (
    <div className={'product-image ' + (p.category || '').toLowerCase()}>
      {p.imageUrl ? (
        <img src={p.imageUrl} alt={p.name} />
      ) : (
        <span>
          {p.emoji ||
            (
              {
                Dairy: '🥛',
                Fruits: '🍌',
                Vegetables: '🍅',
                Grocery: '🌾',
                Bakery: '🥐',
              } as Row
            )[p.category] ||
            '🛍️'}
        </span>
      )}
    </div>
  );
}
export function OrderItems({ order: o }: { order: Row }) {
  return (
    <div className="order-items">
      {o.items.map((i: Row) => (
        <div key={i.productId}>
          <span className="item-emoji">{i.emoji || '🛍️'}</span>
          <div className="grow">
            <strong>{i.name}</strong>
            <small className="muted">
              {i.quantity} × {money(i.price)}
            </small>
          </div>
          <strong>{money(i.quantity * i.price)}</strong>
        </div>
      ))}
    </div>
  );
}
export function Totals({ order: o }: { order: Row }) {
  return (
    <div className="totals">
      <p>
        <span>Subtotal</span>
        <strong>{money(o.subtotal)}</strong>
      </p>
      <p>
        <span>Delivery Fee</span>
        <strong>{money(o.deliveryFee)}</strong>
      </p>
      <p>
        <span>Total</span>
        <strong>{money(o.total)}</strong>
      </p>
    </div>
  );
}
