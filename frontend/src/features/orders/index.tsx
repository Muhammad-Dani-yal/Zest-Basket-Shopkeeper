import {
  Check,
  Clock,
  Download,
  MapPin,
  Package,
  Phone,
  Printer,
  ShieldCheck,
  Star,
  Truck,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Empty,
  Logo,
  Modal,
  OrderCard,
  OrderItems,
  Pill,
  QueryView,
  TopBar,
  Totals,
  useApp,
} from '../../components/ui';
import { date, useData, type Row } from '../../services/api';

export function Orders() {
  const q = useData('/orders'),
    location = useLocation(),
    [tab, setTab] = useState(
      new URLSearchParams(location.search).get('tab') || 'New',
    );
  return (
    <>
      <TopBar title="Orders" />
      <div className="page">
        <div className="tabs">
          {['New', 'Accepted', 'Preparing', 'Ready', 'All'].map(t => (
            <button
              className={tab === t ? 'selected' : ''}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'New' && q.data
                ? ' (' +
                  q.data.filter((o: Row) => o.status === 'New').length +
                  ')'
                : ''}
            </button>
          ))}
        </div>
        <QueryView query={q}>
          {(data: Row[]) => {
            const rows = data.filter(
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
              rows.map(o => <OrderCard key={o.id} order={o} />)
            ) : (
              <Empty
                title="No Orders Yet"
                description="Your new orders will appear here."
                action="Refresh"
                onClick={() => q.refetch()}
              />
            );
          }}
        </QueryView>
      </div>
    </>
  );
}
export function Order() {
  const { id } = useParams(),
    q = useData('/orders/' + id),
    rewards = useData('/rewards'),
    location = useLocation(),
    nav = useNavigate(),
    { mutate, notify, me } = useApp(),
    [busy, setBusy] = useState(false),
    [checked, setChecked] = useState<string[]>([]),
    [otp, setOtp] = useState(['', '', '', '']),
    [ledger, setLedger] = useState(false),
    [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const section = location.pathname.split('/')[3] || 'details';
  const action = async (path: string, body?: any, to?: string) => {
    setBusy(true);
    try {
      await mutate('/orders/' + id + '/' + path, body, 'POST', 'Order updated');
      if (to) nav('/orders/' + id + to);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <TopBar
        title={
          (
            {
              details: 'Order Details',
              receipt: 'Order Receipt',
              rider: 'Rider Assignment',
              packing: 'Packing Confirmation',
              preparation: 'Order Preparation',
            } as Row
          )[section] || 'Order Details'
        }
      />
      <div
        className={
          'page order-page ' + (section === 'receipt' ? 'receipt-page' : '')
        }
      >
        <QueryView query={q}>
          {(o: Row) => {
            const remaining = Math.max(
              0,
              600 -
                Math.floor(
                  (tick - Date.parse(o.preparationStartedAt || o.createdAt)) /
                    1000,
                ),
            );
            return (
              <>
                {section === 'details' && (
                  <>
                    <Card>
                      <div className="order-card-top">
                        <span className="round-icon red-bg">
                          <User size={22} />
                        </span>
                        <div className="grow">
                          <h3>#{o.orderNumber}</h3>
                          <small className="muted">
                            Placed {date(o.createdAt)}
                          </small>
                        </div>
                        <Pill>{o.status}</Pill>
                      </div>
                      <div className="customer-details">
                        <p>
                          <User size={15} />
                          {o.customer.name}
                        </p>
                        <a href={'tel:' + o.customer.phone}>
                          <Phone size={15} />
                          {o.customer.phone}
                        </a>
                        <p>
                          <MapPin size={15} />
                          {o.address}
                        </p>
                      </div>
                    </Card>
                    <h3 className="section-label">Items</h3>
                    <Card>
                      <OrderItems order={o} />
                    </Card>
                    <Totals order={o} />
                    <Card>
                      <h3>Special Instructions</h3>
                      <p className="muted">{o.instructions}</p>
                      <div className="section-heading">
                        <span>Payment · {o.paymentMethod}</span>
                        <Pill>{o.paymentStatus}</Pill>
                      </div>
                    </Card>
                    {o.customerResolution && (
                      <Card>
                        <h3>Customer approval required</h3>
                        <p>{o.rejectionReason}</p>
                        {o.customerResolution.choices.map((s: string) => (
                          <p className="muted" key={s}>
                            • {s}
                          </p>
                        ))}
                      </Card>
                    )}
                    <div className="actions">
                      <Link
                        className="btn outline"
                        to={'/orders/' + id + '/receipt'}
                      >
                        View Receipt
                      </Link>
                      {[
                        'Preparing',
                        'Ready for Pickup',
                        'Handed Over',
                        'Delivered',
                      ].includes(o.status) && (
                        <Link
                          className="btn"
                          to={
                            '/orders/' +
                            id +
                            (o.status === 'Preparing'
                              ? '/preparation'
                              : '/rider')
                          }
                        >
                          Track Order
                        </Link>
                      )}
                    </div>
                    {o.status === 'New' && <OrderCard order={o} compact />}
                    {o.status === 'Accepted' && (
                      <Button
                        kind="gradient full"
                        disabled={busy}
                        onClick={() =>
                          action('start-preparing', {}, '/preparation')
                        }
                      >
                        Start Preparing
                      </Button>
                    )}
                    {o.isDemo &&
                      me.user.id === 'demo-owner' &&
                      o.status === 'Handed Over' && (
                        <Button
                          kind="outline full"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await mutate(
                                '/demo/orders/' + id + '/deliver',
                                {},
                                'POST',
                                'Demo delivery recorded',
                              );
                            } catch {
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Demo: Mark Delivered & Record Payment
                        </Button>
                      )}
                  </>
                )}
                {section === 'receipt' && (
                  <>
                    <div className="receipt">
                      <Logo small />
                      <h3>Order ID #{o.orderNumber}</h3>
                      <p className="muted">
                        Date: {date(o.createdAt)}
                        <br />
                        Shop: {me.shop.shopName}
                        <br />
                        {o.address}
                      </p>
                      <OrderItems order={o} />
                      <Totals order={o} />
                      <div className="receipt-details">
                        <p>Special Instructions: {o.instructions}</p>
                        <p>
                          Payment Method: <strong>{o.paymentMethod}</strong>
                        </p>
                        <p>
                          Payment Status: <Pill>{o.paymentStatus}</Pill>
                        </p>
                        <p>
                          Order Status: <Pill>{o.status}</Pill>
                        </p>
                      </div>
                      {o.isDemo && (
                        <div className="demo-banner">
                          Demo order · no live payment processed
                        </div>
                      )}
                    </div>
                    <div className="actions no-print">
                      <Button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const r = await fetch(
                              '/api/orders/' + id + '/receipt?format=pdf',
                              { credentials: 'include' },
                            );
                            if (!r.ok) throw Error('Receipt download failed');
                            const url = URL.createObjectURL(await r.blob()),
                              a = document.createElement('a');
                            a.href = url;
                            a.download = 'ZestBasket-' + o.orderNumber + '.pdf';
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 30000);
                            notify('Receipt downloaded');
                          } catch (e: any) {
                            notify(e.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <Download size={16} /> Download PDF
                      </Button>
                      <Button kind="outline" onClick={() => window.print()}>
                        <Printer size={16} /> Print
                      </Button>
                    </div>
                  </>
                )}
                {section === 'preparation' && (
                  <>
                    <Card>
                      <div className="section-heading">
                        <h3>#{o.orderNumber}</h3>
                        <small className="muted">{date(o.createdAt)}</small>
                      </div>
                      <div className="countdown">
                        <Clock size={23} />
                        <strong>
                          {remaining
                            ? String(Math.floor(remaining / 60)).padStart(
                                2,
                                '0',
                              ) +
                              ':' +
                              String(remaining % 60).padStart(2, '0')
                            : '00:00'}
                        </strong>
                        <span>10 Minute Target</span>
                        <small>
                          {o.status === 'Preparing'
                            ? remaining
                              ? 'A little care makes every order better.'
                              : 'Order is late. Complete packing as soon as possible.'
                            : 'Preparation completed'}
                        </small>
                      </div>
                      <div className="timeline-horizontal">
                        {['Accepted', 'Preparing', 'Packing', 'Ready'].map(
                          (s, i) => (
                            <div
                              key={s}
                              className={
                                i <
                                ([
                                  'Ready for Pickup',
                                  'Handed Over',
                                  'Delivered',
                                ].includes(o.status)
                                  ? 4
                                  : 2)
                                  ? 'done'
                                  : ''
                              }
                            >
                              <span>
                                <Check size={14} />
                              </span>
                              <small>{s}</small>
                            </div>
                          ),
                        )}
                      </div>
                    </Card>
                    <Card>
                      <h3>Golden Points</h3>
                      <div className="points">
                        <span>🏅</span>
                        <strong>{rewards.data?.points || 0} / 50</strong>
                      </div>
                      <progress max={50} value={rewards.data?.points || 0} />
                      <p className="muted small">
                        Get 50 points to unlock the Golden Badge!
                      </p>
                    </Card>
                    <Button kind="full outline" onClick={() => setLedger(true)}>
                      View Points History
                    </Button>
                    {o.status === 'Preparing' && (
                      <Link
                        className="btn gradient full"
                        to={'/orders/' + id + '/packing'}
                      >
                        <Package size={18} /> Continue to Packing
                      </Link>
                    )}
                    {o.status === 'Ready for Pickup' && (
                      <Link
                        className="btn full"
                        to={'/orders/' + id + '/rider'}
                      >
                        Rider & Handover
                      </Link>
                    )}
                  </>
                )}
                {section === 'packing' && (
                  <div className="packing">
                    <div className="packing-icon">
                      <Package size={36} />
                    </div>
                    <h2>Order Pack Ho Gaya?</h2>
                    <p className="muted">
                      Kya aap ne order ke tamam items
                      <br />
                      check karke pack kar liye hain?
                    </p>
                    <Card>
                      <h3>Check every item</h3>
                      {o.items.map((i: Row) => (
                        <label className="checklist" key={i.productId}>
                          <input
                            type="checkbox"
                            checked={checked.includes(i.productId)}
                            onChange={e =>
                              setChecked(
                                e.target.checked
                                  ? [...checked, i.productId]
                                  : checked.filter(p => p !== i.productId),
                              )
                            }
                          />
                          <span>{i.name}</span>
                          <strong>× {i.quantity}</strong>
                        </label>
                      ))}
                    </Card>
                    <Button
                      kind="gradient full"
                      disabled={
                        busy ||
                        o.status !== 'Preparing' ||
                        checked.length !== o.items.length
                      }
                      onClick={() =>
                        action(
                          'confirm-packing',
                          {
                            items: o.items.map((i: Row) => ({
                              productId: i.productId,
                              quantity: i.quantity,
                            })),
                          },
                          '/rider',
                        )
                      }
                    >
                      Haan, Confirm Karo
                    </Button>
                    <Button
                      kind="outline full"
                      onClick={() => nav('/orders/' + id + '/preparation')}
                    >
                      Nahi, Wapas Jao
                    </Button>
                    <small className="muted">
                      Missing an item?{' '}
                      <Link to="/support">Contact Support</Link> for
                      customer-approved resolution.
                    </small>
                  </div>
                )}
                {section === 'rider' && (
                  <>
                    {o.rider ? (
                      <Card>
                        <h3>
                          <span className="live-dot" /> Rider Assigned
                        </h3>
                        <div className="rider-profile">
                          <Avatar rider />
                          <div>
                            <h3>{o.rider.name}</h3>
                            <a href={'tel:' + o.rider.phone}>{o.rider.phone}</a>
                            <small className="muted">
                              <Star size={12} /> {o.rider.rating} Rating
                            </small>
                            <Pill>Available</Pill>
                          </div>
                        </div>
                        <hr />
                        <h3>Rider Details</h3>
                        <div className="rider-bike">
                          <Truck size={27} />
                          <div>
                            {o.rider.bikeModel}
                            <small className="muted">
                              License: {o.rider.licensePlate}
                            </small>
                          </div>
                        </div>
                        <hr />
                        <h3>Order Status</h3>
                        <div className="timeline-vertical">
                          {[
                            'Rider Assigned',
                            'Ready for Pickup',
                            'Handed Over',
                          ].map((s, i) => (
                            <div
                              key={s}
                              className={
                                i === 0 ||
                                (i === 1 &&
                                  [
                                    'Ready for Pickup',
                                    'Handed Over',
                                    'Delivered',
                                  ].includes(o.status)) ||
                                (i === 2 &&
                                  ['Handed Over', 'Delivered'].includes(
                                    o.status,
                                  ))
                                  ? 'done'
                                  : ''
                              }
                            >
                              <span>
                                <Check size={12} />
                              </span>
                              <strong>{s}</strong>
                              <small>
                                {o.timestamps?.[s]
                                  ? new Date(
                                      o.timestamps[s],
                                    ).toLocaleTimeString('en-PK', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </small>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : (
                      <Empty
                        title="Waiting for rider"
                        description="Rider details will appear when assigned."
                        action="Refresh"
                        onClick={() => q.refetch()}
                      />
                    )}
                    <Card>
                      <h3>Pickup OTP</h3>
                      {o.isDemo && (
                        <p className="demo-banner">
                          Demo order only · test OTP: 4587
                        </p>
                      )}
                      <div className="otp">
                        {otp.map((v, i) => (
                          <input
                            key={i}
                            aria-label={'OTP digit ' + (i + 1)}
                            inputMode="numeric"
                            maxLength={1}
                            value={v}
                            onPaste={e => {
                              e.preventDefault();
                              const s = e.clipboardData
                                .getData('text')
                                .replace(/\D/g, '')
                                .slice(0, 4);
                              setOtp(
                                s
                                  .padEnd(4, ' ')
                                  .split('')
                                  .map(x => x.trim()),
                              );
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Backspace' && !v)
                                (
                                  e.currentTarget
                                    .previousElementSibling as HTMLInputElement
                                )?.focus();
                            }}
                            onChange={e => {
                              const s = e.target.value
                                .replace(/\D/g, '')
                                .slice(-1);
                              setOtp(otp.map((x, n) => (n === i ? s : x)));
                              if (s)
                                (
                                  e.target
                                    .nextElementSibling as HTMLInputElement
                                )?.focus();
                            }}
                          />
                        ))}
                      </div>
                      <Button
                        kind="full"
                        disabled={
                          busy ||
                          otp.join('').length !== 4 ||
                          o.status !== 'Ready for Pickup'
                        }
                        onClick={() =>
                          action('verify-pickup-otp', { otp: otp.join('') })
                        }
                      >
                        <ShieldCheck size={17} />
                        {o.status === 'Handed Over' || o.status === 'Delivered'
                          ? 'Handover Complete'
                          : 'Verify OTP'}
                      </Button>
                      {o.status !== 'Ready for Pickup' &&
                        !['Handed Over', 'Delivered'].includes(o.status) && (
                          <p className="muted small">
                            Complete preparation and packing before handover.
                          </p>
                        )}
                    </Card>
                    <Link className="btn outline full" to={'/orders/' + id}>
                      View Order
                    </Link>
                  </>
                )}
              </>
            );
          }}
        </QueryView>
      </div>
      {ledger && (
        <Modal title="Golden Points History" onClose={() => setLedger(false)}>
          <QueryView query={rewards}>
            {(r: Row) => (
              <>
                {r.ledger.map((l: Row) => (
                  <div className="ledger-row" key={l.id}>
                    <div>
                      <strong>{l.reason}</strong>
                      <small className="muted">{date(l.createdAt)}</small>
                    </div>
                    <Pill>{'+' + l.points}</Pill>
                  </div>
                ))}
              </>
            )}
          </QueryView>
        </Modal>
      )}
    </>
  );
}
