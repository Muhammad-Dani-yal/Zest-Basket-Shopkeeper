import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { qc } from '../src/services/api';
import { App } from '../src/app/App';
import { QueryView, Modal } from '../src/components/ui';
import { seed } from '../../backend/src/store';
const d = seed(),
  me = {
    user: { ...d.users[0], passwordHash: undefined, cnic: 'XXXXX-XXXXXXX-X' },
    shop: d.shops[0],
    demoMode: true,
  };
const order = {
  ...d.orders[0],
  status: 'Preparing',
  preparationStartedAt: new Date().toISOString(),
};
function render(route: string) {
  qc.clear();
  qc.setQueryData(['/auth/me'], me);
  const data: Record<string, any> = {
    '/products': d.products,
    '/orders': [order, ...d.orders.slice(1)],
    '/orders/ZB10045': order,
    '/rewards': { points: 48, ledger: d.rewards },
    '/notifications': d.notifications,
    '/shop/me': d.shops[0],
    '/support/tickets': d.tickets,
    '/auth/sessions': [
      {
        id: 'session',
        current: true,
        createdAt: new Date().toISOString(),
        device: 'Test browser',
      },
    ],
    '/dashboard/summary': {
      newOrders: 2,
      activeOrders: 1,
      todaySales: 800,
      unread: 2,
    },
    '/inventory/history?action=All&page=1': {
      items: d.logs,
      total: d.logs.length,
      page: 1,
    },
    '/earnings?from=&to=': {
      transactions: d.transactions,
      totalSales: 1000,
      commission: 100,
      earnings: 900,
      pending: 300,
    },
    '/reports/sales?from=&to=': {
      transactions: d.transactions,
      totalSales: 1000,
      commission: 100,
      earnings: 900,
      pending: 300,
      totalOrders: 9,
      cancelledOrders: 0,
      chart: [{ date: '2026-11-02', sales: 1000, profit: 900 }],
      bestSellers: [{ name: 'Flour', quantity: 2, emoji: '🌾' }],
    },
  };
  Object.entries(data).forEach(([k, v]) => qc.setQueryData([k], v));
  return renderToString(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(
        MemoryRouter,
        { initialEntries: [route] },
        createElement(App),
      ),
    ),
  );
}
for (const [route, text] of [
  ['/welcome', 'Welcome,'],
  ['/register', 'Shop Owner Details'],
  ['/login', 'Shopkeeper Login'],
  ['/dashboard', 'Recent Orders'],
  ['/inventory', 'Organic Wheat Flour'],
  ['/inventory/add', 'Save Product'],
  ['/orders', 'Orders'],
  ['/orders/ZB10045', 'Special Instructions'],
  ['/orders/ZB10045/receipt', 'Download PDF'],
  ['/orders/ZB10045/rider', 'Verify OTP'],
  ['/orders/ZB10045/packing', 'Haan, Confirm Karo'],
  ['/earnings', 'Payments &amp; Earnings'],
  ['/reports', 'Sales Reports'],
  ['/orders/ZB10045/preparation', 'Golden Points'],
  ['/support', 'Customer Support'],
  ['/shop/profile', 'Operating Hours'],
  ['/shop/status', 'Manage Shop Status'],
  ['/security', 'Coming Soon'],
  ['/notifications', 'New order received'],
  ['/inventory/history', 'Inventory History'],
  ['/settings', 'Business &amp; Support'],
  ['/branding', 'Manage. Grow. Succeed.'],
])
  test('route renders: ' + route, () =>
    assert.ok(render(route).includes(text), 'Expected ' + text),
  );
test('empty orders and inventory states render in their own page shells', () => {
  render('/orders');
  qc.setQueryData(['/orders'], []);
  const page = renderToString(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(
        MemoryRouter,
        { initialEntries: ['/orders'] },
        createElement(App),
      ),
    ),
  );
  assert.ok(page.includes('No Orders Yet'));
  assert.ok(page.includes('bottom-nav'));
  render('/inventory');
  qc.setQueryData(['/products'], []);
  const inv = renderToString(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(
        MemoryRouter,
        { initialEntries: ['/inventory'] },
        createElement(App),
      ),
    ),
  );
  assert.ok(inv.includes('No Products Found'));
});
test('closed shop state remains connected to existing orders', () => {
  render('/shop/status');
  qc.setQueryData(['/auth/me'], {
    ...me,
    shop: { ...me.shop, status: 'closed' },
  });
  const page = renderToString(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(
        MemoryRouter,
        { initialEntries: ['/shop/status'] },
        createElement(App),
      ),
    ),
  );
  assert.ok(page.includes('Your shop is currently closed.'));
  assert.ok(page.includes('View existing orders'));
});
qc.clear();

test('loading, network error and confirmation dialog states render', () => {
  const loading = renderToString(
    createElement(QueryView, { query: { isPending: true } }),
  );
  assert.ok(loading.includes('Loading...'));
  const error = renderToString(
    createElement(QueryView, {
      query: {
        isPending: false,
        error: new Error('Offline'),
        refetch: () => {},
      },
    }),
  );
  assert.ok(error.includes('Network Error'));
  assert.ok(error.includes('Retry'));
  const modal = renderToString(
    createElement(
      Modal,
      { title: 'Delete Product?', onClose: () => {} },
      createElement('button', null, 'Cancel'),
    ),
  );
  assert.ok(modal.includes('aria-modal="true"'));
  assert.ok(modal.includes('Delete Product?'));
});
