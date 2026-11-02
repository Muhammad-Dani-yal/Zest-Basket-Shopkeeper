import { Bell, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, QueryView, TopBar, useApp } from '../../components/ui';
import { date, useData, type Row } from '../../services/api';

export function Notifications() {
  const q = useData('/notifications'),
    [filter, setFilter] = useState('All'),
    { mutate } = useApp(),
    nav = useNavigate();
  return (
    <>
      <TopBar
        title="Notifications"
        action={
          <button
            className="text-button"
            onClick={() =>
              mutate(
                '/notifications/read-all',
                {},
                'POST',
                'All notifications read',
              ).catch(() => {})
            }
          >
            Read all
          </button>
        }
      />
      <div className="page">
        <div className="chips">
          {['All', 'Orders', 'System', 'Offers'].map(f => (
            <button
              key={f}
              className={f === filter ? 'selected' : ''}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <QueryView query={q}>
          {(data: Row[]) => {
            const rows = data.filter(
              n => filter === 'All' || n.category === filter,
            );
            return rows.length ? (
              rows.map((n: Row, i: number) => (
                <button
                  className={'notification ' + (!n.read ? 'unread' : '')}
                  key={n.id}
                  onClick={async () => {
                    try {
                      await mutate(
                        '/notifications/' + n.id + '/read',
                        {},
                        'PATCH',
                        '',
                      );
                      nav(n.href);
                    } catch {}
                  }}
                >
                  <span
                    className={
                      'round-icon ' +
                      ['orange', 'green', 'purple'][i % 3] +
                      '-bg'
                    }
                  >
                    {n.category === 'Orders' ? (
                      <ShoppingBag size={20} />
                    ) : (
                      <Bell size={20} />
                    )}
                  </span>
                  <span className="grow">
                    <strong>{n.title}</strong>
                    <small>{n.detail}</small>
                    <small className="muted">{date(n.createdAt)}</small>
                  </span>
                  {!n.read && <i className="unread-dot" />}
                </button>
              ))
            ) : (
              <Empty
                title="You're all caught up"
                description="New notifications will appear here."
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
