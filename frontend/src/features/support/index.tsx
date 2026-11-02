import { useQuery } from '@tanstack/react-query';
import { Headphones, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Empty,
  Modal,
  Pill,
  QueryView,
  TopBar,
  useApp,
} from '../../components/ui';
import { api, date, useData, type Row } from '../../services/api';

export function Support() {
  const q = useData('/support/tickets'),
    { mutate, notify } = useApp(),
    [tab, setTab] = useState('My Tickets'),
    [selected, setSelected] = useState<Row | null>(null),
    [reply, setReply] = useState(''),
    [busy, setBusy] = useState(false),
    [attachment, setAttachment] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Row>();
  const msgs = useQuery({
    queryKey: ['/support/tickets/' + selected?.id + '/messages'],
    queryFn: () => api('/support/tickets/' + selected?.id + '/messages'),
    enabled: !!selected,
  });
  return (
    <>
      <TopBar title="Customer Support" />
      <div className="page">
        <div className="support-intro">
          <span className="round-icon purple-bg">
            <Headphones size={25} />
          </span>
          <h2>We're here to help.</h2>
          <p className="muted">A little support goes a long way.</p>
        </div>
        <div className="tabs">
          {['My Tickets', 'New Ticket'].map(t => (
            <button
              key={t}
              className={tab === t ? 'selected' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'My Tickets' ? (
          <>
            <QueryView query={q}>
              {(tickets: Row[]) =>
                tickets.length ? (
                  tickets.map(t => (
                    <button
                      className="card ticket-card"
                      key={t.id}
                      onClick={() => setSelected(t)}
                    >
                      <div>
                        <h3>#{t.id}</h3>
                        <p>{t.subject}</p>
                        <small className="muted">{date(t.createdAt)}</small>
                      </div>
                      <Pill>{t.status}</Pill>
                    </button>
                  ))
                ) : (
                  <Empty
                    title="No tickets yet"
                    description="Need a hand? Start a support ticket."
                    action="New Ticket"
                    onClick={() => setTab('New Ticket')}
                  />
                )
              }
            </QueryView>
            <Button kind="full" onClick={() => setTab('New Ticket')}>
              <Mail size={17} />
              Contact Support
            </Button>
            <p className="muted center small">
              Your shop matters. Send us a message anytime.
            </p>
          </>
        ) : (
          <form
            onSubmit={handleSubmit(async b => {
              try {
                await mutate(
                  '/support/tickets',
                  {
                    ...b,
                    orderId: b.orderId || undefined,
                    attachment: attachment || undefined,
                  },
                  'POST',
                  'Support ticket created',
                );
                reset();
                setAttachment('');
                setTab('My Tickets');
              } catch {}
            })}
          >
            <label className="field">
              Issue Type
              <select {...register('issueType', { required: true })}>
                {[
                  'General',
                  'Missing Item',
                  'Wrong Product',
                  'Order Issue',
                  'Payments',
                  'Operating Hours',
                ].map(x => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Subject *
              <input
                {...register('subject', { required: true, minLength: 3 })}
              />
              {errors.subject && (
                <small className="danger">At least 3 characters</small>
              )}
            </label>
            <label className="field">
              Description *
              <textarea
                rows={5}
                {...register('description', { required: true, minLength: 10 })}
              />
              {errors.description && (
                <small className="danger">At least 10 characters</small>
              )}
            </label>
            <label className="field">
              Order Number (optional)
              <input placeholder="ZB10045" {...register('orderId')} />
            </label>
            <label className="field">
              Image attachment (optional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    const form = new FormData();
                    form.append('image', f);
                    setAttachment((await api('/uploads', 'POST', form)).url);
                  } catch (e: any) {
                    notify(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            {attachment && <p className="muted">Attachment uploaded ✓</p>}
            <Button
              kind="gradient full"
              type="submit"
              disabled={isSubmitting || busy}
            >
              Submit Ticket
            </Button>
          </form>
        )}
      </div>
      {selected && (
        <Modal
          title={'#' + selected.id + ' · ' + selected.subject}
          onClose={() => setSelected(null)}
        >
          <Pill>{selected.status}</Pill>
          {selected.attachment && (
            <a href={selected.attachment} target="_blank" rel="noreferrer">
              View attachment
            </a>
          )}
          <div className="conversation">
            <QueryView query={msgs}>
              {(m: Row[]) =>
                m.map(m => (
                  <div className="message" key={m.id}>
                    <strong>{m.author}</strong>
                    <p>{m.body}</p>
                    <small>{date(m.createdAt)}</small>
                  </div>
                ))
              }
            </QueryView>
          </div>
          <form
            onSubmit={async e => {
              e.preventDefault();
              setBusy(true);
              try {
                await mutate(
                  '/support/tickets/' + selected.id + '/messages',
                  { body: reply },
                  'POST',
                  'Reply sent',
                );
                setReply('');
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Your Reply
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                required
              />
            </label>
            <Button kind="full" type="submit" disabled={busy || !reply.trim()}>
              <Send size={16} /> Send Reply
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
