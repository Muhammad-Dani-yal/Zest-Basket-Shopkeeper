import {
  Calendar,
  ChartColumn,
  Clock,
  Download,
  ShieldCheck,
  ShoppingBag,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Button,
  Card,
  Modal,
  Pill,
  QueryView,
  TopBar,
  Totals,
} from '../../components/ui';
import { money, useData, type Row } from '../../services/api';

function exportCSV(rows: Row[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys, ...rows.map(r => keys.map(k => r[k]))]
    .map(row =>
      row
        .map(
          v =>
            '"' +
            String(v ?? '')
              .replace(/"/g, '""')
              .replace(/^[=+@-]/, "'$&") +
            '"',
        )
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    ),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function Finance({ reports = false }: { reports?: boolean }) {
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [tab, setTab] = useState(reports ? 'Daily' : 'Payment History'),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Row | null>(null);
  const q = useData(
    (reports ? '/reports/sales' : '/earnings') + '?from=' + from + '&to=' + to,
  );
  return (
    <>
      <TopBar
        title={reports ? 'Sales Reports' : 'Payments & Earnings'}
        action={
          <button
            aria-label="Export CSV"
            onClick={() => {
              if (q.data)
                exportCSV(
                  reports ? q.data.chart : q.data.transactions,
                  reports ? 'zestbasket-sales.csv' : 'zestbasket-earnings.csv',
                );
            }}
          >
            <Download size={19} />
          </button>
        }
      />
      <div className="page">
        <div className="date-range">
          <Calendar size={17} />
          <label>
            From
            <input
              aria-label="From date"
              type="date"
              value={from}
              max={to || undefined}
              onChange={e => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <span>—</span>
          <label>
            To
            <input
              aria-label="To date"
              type="date"
              value={to}
              min={from || undefined}
              onChange={e => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {(from || to) && (
            <button
              aria-label="Clear date range"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="demo-banner">
          <ShieldCheck size={15} /> Simulated demo ledger · no real money
          transferred
        </div>
        <QueryView query={q}>
          {(data: Row) => {
            let chart = data.chart || [];
            if (tab === 'Weekly') {
              const weeks: Record<string, Row> = {};
              chart.forEach((r: Row) => {
                const d = new Date(r.date);
                d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                const key = d.toISOString().slice(0, 10);
                weeks[key] ??= { date: key, sales: 0, profit: 0 };
                weeks[key].sales += r.sales;
                weeks[key].profit += r.profit;
              });
              chart = Object.values(weeks);
            }
            return (
              <>
                <div className={'finance-grid ' + (reports ? 'three' : '')}>
                  {(reports
                    ? [
                        ['Total Sales', data.totalSales, Wallet, 'green'],
                        [
                          'Total Orders',
                          data.totalOrders,
                          ShoppingBag,
                          'purple',
                        ],
                        ['Canceled Orders', data.cancelledOrders, X, 'orange'],
                      ]
                    : [
                        ['Total Sales', data.totalSales, Wallet, 'green'],
                        ['Shop Earnings', data.earnings, ShoppingBag, 'green'],
                        [
                          'Platform Commission',
                          data.commission,
                          ChartColumn,
                          'orange',
                        ],
                        ['Pending Settlement', data.pending, Clock, 'orange'],
                      ]
                  ).map(([title, value, Icon, color]: any) => (
                    <Card key={title}>
                      <span className={'round-icon ' + color + '-bg'}>
                        <Icon size={20} />
                      </span>
                      <div>
                        <small>{title}</small>
                        <strong>
                          {reports && title !== 'Total Sales'
                            ? value
                            : money(value)}
                        </strong>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="tabs">
                  {(reports
                    ? ['Daily', 'Weekly', 'Profit']
                    : ['Payment History', 'Earnings Report']
                  ).map(t => (
                    <button
                      key={t}
                      className={tab === t ? 'selected' : ''}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {reports ? (
                  <>
                    <Card>
                      <h3>
                        {tab === 'Profit'
                          ? 'Net Earnings'
                          : tab === 'Weekly'
                          ? 'Weekly Sales Overview'
                          : 'Sales Overview'}
                      </h3>
                      {chart.length ? (
                        <div className="chart">
                          <ResponsiveContainer width="100%" height={230}>
                            <BarChart data={chart}>
                              <CartesianGrid
                                stroke="#eeeafa"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(v: string) =>
                                  new Date(v).toLocaleDateString('en-PK', {
                                    weekday:
                                      tab === 'Weekly' ? undefined : 'short',
                                    day:
                                      tab === 'Weekly' ? 'numeric' : undefined,
                                    month:
                                      tab === 'Weekly' ? 'short' : undefined,
                                  })
                                }
                                tick={{ fill: '#7483A7', fontSize: 10 }}
                              />
                              <YAxis
                                width={40}
                                tick={{ fill: '#7483A7', fontSize: 10 }}
                              />
                              <Tooltip
                                formatter={(v: any) => money(Number(v))}
                              />
                              <Bar
                                dataKey={tab === 'Profit' ? 'profit' : 'sales'}
                                fill="#6815ef"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={25}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="muted center">
                          No sales in this date range.
                        </p>
                      )}
                    </Card>
                    <Card>
                      <h3>Best Selling Products</h3>
                      {data.bestSellers.length ? (
                        data.bestSellers.map((p: Row) => (
                          <div className="ledger-row" key={p.name}>
                            <span className="item-emoji">{p.emoji}</span>
                            <strong className="grow">{p.name}</strong>
                            <Pill>{p.quantity}</Pill>
                          </div>
                        ))
                      ) : (
                        <p className="muted">
                          No products sold in this period.
                        </p>
                      )}
                    </Card>
                  </>
                ) : tab === 'Payment History' ? (
                  <>
                    <table className="payments-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transactions
                          .slice((page - 1) * 8, page * 8)
                          .map((t: Row) => (
                            <tr key={t.id} onClick={() => setSelected(t)}>
                              <td>
                                <button
                                  aria-label={'View transaction ' + t.orderId}
                                >
                                  {new Date(t.createdAt).toLocaleDateString(
                                    'en-PK',
                                    { day: '2-digit', month: 'short' },
                                  )}
                                </button>
                              </td>
                              <td>{t.paymentMethod}</td>
                              <td>{money(t.amount)}</td>
                              <td>
                                <Pill>{t.paymentStatus}</Pill>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!data.transactions.length && (
                      <p className="muted center">
                        No transactions in this period.
                      </p>
                    )}
                    <div className="pagination">
                      <Button
                        kind="outline"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <span>{page}</span>
                      <Button
                        kind="outline"
                        disabled={page * 8 >= data.transactions.length}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </>
                ) : (
                  <Card>
                    <h3>Earnings Breakdown</h3>
                    <div className="totals">
                      <p>
                        <span>Gross product sales</span>
                        <strong>{money(data.totalSales)}</strong>
                      </p>
                      <p>
                        <span>Platform commission</span>
                        <strong>{money(data.commission)}</strong>
                      </p>
                      <p>
                        <span>Net shop earnings</span>
                        <strong>{money(data.earnings)}</strong>
                      </p>
                      <p>
                        <span>Pending settlement</span>
                        <strong>{money(data.pending)}</strong>
                      </p>
                      <p>
                        <span>Settled</span>
                        <strong>{money(data.earnings - data.pending)}</strong>
                      </p>
                    </div>
                    <Link to="/reports" className="btn outline full">
                      Open Sales Reports
                    </Link>
                  </Card>
                )}
              </>
            );
          }}
        </QueryView>
      </div>
      {selected && (
        <Modal
          title="Demo Transaction Details"
          onClose={() => setSelected(null)}
        >
          <p>
            Order{' '}
            <Link to={'/orders/' + selected.orderId}>#{selected.orderId}</Link>
          </p>
          <Totals
            order={{
              subtotal: selected.amount,
              deliveryFee: 0,
              total: selected.amount,
            }}
          />
          <p>Commission: {money(selected.commission)}</p>
          <p>Net earnings: {money(selected.settlementAmount)}</p>
          <Pill>{selected.settled ? 'Settled' : 'Pending'}</Pill>
          <p className="muted">
            Simulated transaction. No live money transferred.
          </p>
        </Modal>
      )}
    </>
  );
}
