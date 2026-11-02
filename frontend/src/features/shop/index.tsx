import {
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck,
  Headphones,
  MapPin,
  Pencil,
  SlidersHorizontal,
  Store,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Modal,
  Pill,
  QueryView,
  RowLink,
  TopBar,
  useApp,
} from '../../components/ui';
import { api, useData, type Row } from '../../services/api';

export function Profile() {
  const { me, mutate, notify } = useApp(),
    q = useData('/shop/me'),
    location = useLocation(),
    [editor, setEditor] = useState(''),
    [busy, setBusy] = useState(false),
    [verification, setVerification] = useState<any>(null),
    [document, setDocument] = useState('');
  const { register, handleSubmit, reset } = useForm<Row>();
  const open = (type: string, s: Row) => {
    setEditor(type);
    reset(
      type === 'hours'
        ? s.workingHours
        : type === 'holidays'
        ? { holidays: (s.holidays || []).join('\n') }
        : type === 'name'
        ? { shopName: s.shopName }
        : { address: s.address, deliveryRadiusKm: s.deliveryRadiusKm },
    );
  };
  useEffect(() => {
    const edit = new URLSearchParams(location.search).get('edit');
    if (q.data && edit) open(edit, q.data);
  }, [q.data, location.search]);
  return (
    <>
      <TopBar title="Shop Profile" />
      <div className="page">
        <QueryView query={q}>
          {(s: Row) => (
            <>
              <Card className="profile-card">
                <label className="profile-photo">
                  {s.shopAvatar ? (
                    <img src={s.shopAvatar} alt="Shop avatar" />
                  ) : (
                    <Avatar />
                  )}
                  <input
                    aria-label="Upload shop avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setBusy(true);
                      try {
                        const form = new FormData();
                        form.append('image', f);
                        const r = await api('/uploads', 'POST', form);
                        await mutate(
                          '/shop/me',
                          { shopAvatar: r.url },
                          'PATCH',
                          'Avatar updated',
                        );
                      } catch (e: any) {
                        notify(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                  <span>
                    <Camera size={13} />
                  </span>
                </label>
                <div>
                  <h2>
                    {s.shopName} <Pill>{s.verificationStatus}</Pill>
                  </h2>
                  <p>Owner: {me.user.fullName}</p>
                  <small>CNIC: {me.user.cnic}</small>
                  <small>Phone: {me.user.phone}</small>
                </div>
              </Card>
              <div className="section-heading">
                <h3>Operating Hours</h3>
                <button
                  className="text-button"
                  onClick={() => open('hours', s)}
                >
                  Edit
                </button>
              </div>
              <Card>
                <div className="hours-list">
                  {Object.entries(s.workingHours || {}).map(([day, h]: any) => (
                    <div key={day}>
                      <span>{day}</span>
                      <strong>
                        {h.open} – {h.close}
                      </strong>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="settings-card">
                <RowLink
                  icon={Calendar}
                  title="Holidays"
                  sub={
                    s.holidays?.length
                      ? s.holidays.join(', ')
                      : 'No holidays set'
                  }
                  onClick={() => open('holidays', s)}
                />
                <RowLink
                  icon={MapPin}
                  title="Delivery Area"
                  sub={s.deliveryRadiusKm + ' km service radius'}
                  onClick={() => open('profile', s)}
                />
                <RowLink
                  icon={Store}
                  title="Edit Shop Details"
                  sub={s.address}
                  onClick={() => open('profile', s)}
                />
                <RowLink
                  icon={SlidersHorizontal}
                  title="Shop Status"
                  sub={s.status === 'active' ? 'Accepting Orders' : s.status}
                  to="/shop/status"
                />
              </Card>
              <div className="status-buttons">
                {[
                  ['active', 'Open'],
                  ['busy', 'Busy'],
                  ['closed', 'Closed'],
                ].map(([key, label]) => (
                  <Link
                    key={key}
                    className={
                      'btn outline ' + key + (s.status === key ? ' chosen' : '')
                    }
                    to={'/shop/status?select=' + key}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <Button
                kind="full"
                disabled={busy}
                onClick={async () => {
                  try {
                    setVerification(await api('/shop/verification'));
                  } catch (e: any) {
                    notify(e.message);
                  }
                }}
              >
                <FileCheck size={17} /> View Verification Documents
              </Button>
              <Button kind="outline full" onClick={() => open('name', s)}>
                Request Shop Name Change
              </Button>
            </>
          )}
        </QueryView>
      </div>
      {editor && (
        <Modal
          title={
            (
              {
                hours: 'Operating Hours',
                holidays: 'Manage Holidays',
                profile: 'Edit Shop Details',
                name: 'Request Shop Name Change',
              } as Row
            )[editor]
          }
          onClose={() => setEditor('')}
        >
          <form
            onSubmit={handleSubmit(async b => {
              setBusy(true);
              try {
                if (editor === 'hours')
                  await mutate(
                    '/shop/hours',
                    b,
                    'PATCH',
                    'Operating hours saved',
                  );
                else if (editor === 'holidays')
                  await mutate(
                    '/shop/me',
                    {
                      holidays: String(b.holidays)
                        .split(/[\n,]/)
                        .map(s => s.trim())
                        .filter(Boolean),
                    },
                    'PATCH',
                    'Holidays saved',
                  );
                else if (editor === 'name')
                  await mutate(
                    '/shop/verification',
                    { shopName: b.shopName, document: document || undefined },
                    'POST',
                    'Submitted for administrator review',
                  );
                else
                  await mutate(
                    '/shop/me',
                    {
                      address: b.address,
                      deliveryRadiusKm: Number(b.deliveryRadiusKm),
                    },
                    'PATCH',
                    'Shop details saved',
                  );
                setEditor('');
              } catch {
              } finally {
                setBusy(false);
              }
            })}
          >
            {editor === 'hours' ? (
              <div className="hours-editor">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d}>
                    <strong>{d}</strong>
                    <input
                      aria-label={d + ' opening time'}
                      type="time"
                      required
                      {...register(d + '.open')}
                    />
                    <input
                      aria-label={d + ' closing time'}
                      type="time"
                      required
                      {...register(d + '.close')}
                    />
                  </div>
                ))}
              </div>
            ) : editor === 'holidays' ? (
              <label className="field">
                Holiday dates (one YYYY-MM-DD per line)
                <textarea rows={5} {...register('holidays')} />
              </label>
            ) : editor === 'name' ? (
              <>
                <p className="muted">
                  Name changes require administrator verification.
                </p>
                <label className="field">
                  New shop name
                  <input required minLength={2} {...register('shopName')} />
                </label>
                <label className="field">
                  Verification document (image)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      try {
                        const data = new FormData();
                        data.append('image', file);
                        setDocument((await api('/uploads', 'POST', data)).url);
                      } catch (e: any) {
                        notify(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </label>
                {document && <small>Document uploaded ✓</small>}
              </>
            ) : (
              <>
                <label className="field">
                  Shop address
                  <textarea required minLength={8} {...register('address')} />
                </label>
                <label className="field">
                  Service / pickup radius (km)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.5}
                    required
                    {...register('deliveryRadiusKm')}
                  />
                </label>
                <small className="muted">
                  Maximum 5 km service radius; route travel distance may be
                  longer.
                </small>
              </>
            )}
            <Button type="submit" kind="gradient full" disabled={busy}>
              Save Changes
            </Button>
          </form>
        </Modal>
      )}
      {verification && (
        <Modal title="Shop Verification" onClose={() => setVerification(null)}>
          <Pill>{verification.status}</Pill>
          <p className="muted">
            Verification can only be approved by an administrator.
          </p>
          {verification.requests.length ? (
            verification.requests.map((r: Row) => (
              <Card key={r.id}>
                <h3>{r.shopName}</h3>
                <Pill>{r.status}</Pill>
                {r.document && (
                  <p>
                    <a href={r.document} target="_blank" rel="noreferrer">
                      View uploaded document
                    </a>
                  </p>
                )}
              </Card>
            ))
          ) : (
            <p>No verification documents uploaded.</p>
          )}
          <Button
            kind="outline full"
            onClick={() => {
              setVerification(null);
              open('name', q.data);
            }}
          >
            Submit Verification Request
          </Button>
        </Modal>
      )}
    </>
  );
}
export function ShopStatus() {
  const { me, mutate } = useApp(),
    [status, setStatus] = useState(
      new URLSearchParams(useLocation().search).get('select') || me.shop.status,
    ),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [editable, setEditable] = useState(false);
  const closed = me.shop.status === 'closed' && !editable;
  const save = async () => {
    setBusy(true);
    try {
      await mutate('/shop/status', { status }, 'PATCH', 'Shop status saved');
      setConfirm(false);
      setEditable(false);
    } catch {
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <TopBar title={closed ? 'Shop Status' : 'Manage Shop Status'} />
      <div className="page">
        <h3 className="section-label">Current Status</h3>
        <div className="status-selector">
          {[
            ['active', 'Free', 'Accepting Orders', CheckCircle2],
            ['busy', 'Busy', 'Limited Orders', Clock],
            ['closed', 'Closed', 'No Orders', X],
          ].map(([key, label, sub, Icon]: any) => (
            <button
              key={key}
              className={key + (status === key ? ' selected' : '')}
              onClick={() => {
                setStatus(key);
                if (closed) setEditable(true);
              }}
            >
              <Icon size={26} />
              <strong>{label}</strong>
              <small>{sub}</small>
            </button>
          ))}
        </div>
        {closed ? (
          <div className="closed-state">
            <div className="empty-icon">
              <Store size={44} />
            </div>
            <h3 className="danger">Your shop is currently closed.</h3>
            <p className="muted">Customers won't be able to place orders.</p>
            <Button kind="full" onClick={() => setEditable(true)}>
              Update Status
            </Button>
            <Link className="text-button" to="/orders">
              View existing orders
            </Link>
          </div>
        ) : (
          <>
            <div className="status-note">
              <span className={'live-dot ' + status} />
              {status === 'active'
                ? 'You are open and ready for fresh orders.'
                : status === 'busy'
                ? 'Order assignments are limited to your shop capacity.'
                : 'New incoming assignments will be paused.'}
            </div>
            <h3 className="section-label">Quick Actions</h3>
            <Card className="settings-card">
              <RowLink to="/shop/profile" title="Edit Profile" icon={User} />
              <RowLink
                to="/shop/profile?edit=name"
                title="Change Shop Name"
                sub="Verification Required"
                icon={Pencil}
              />
              <RowLink
                to="/shop/profile?edit=hours"
                title="Operating Hours"
                icon={Clock}
              />
              <RowLink to="/support" title="Help & Support" icon={Headphones} />
            </Card>
            <Button
              kind="gradient full"
              disabled={busy || status === me.shop.status}
              onClick={() => (status === 'closed' ? setConfirm(true) : save())}
            >
              Save Changes
            </Button>
          </>
        )}
      </div>
      {confirm && (
        <Modal title="Close your shop?" onClose={() => setConfirm(false)}>
          <p className="muted">
            New orders will stop arriving. Please finish your accepted orders.
          </p>
          <div className="actions">
            <Button kind="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={save}>
              Confirm Closed
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
