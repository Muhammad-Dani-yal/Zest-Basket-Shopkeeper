import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';
import { seed, stamp, uid } from './seed';
const KEY = '@zestbasket/native/v1';
let state,
  queue = Promise.resolve();
const clone = v => JSON.parse(JSON.stringify(v));
export async function request(path, method = 'GET', body) {
  if (config.mode === 'api') {
    if (path === '/shop/hours' && method === 'PATCH' && body?.workingHours) {
      await request('/shop/hours', 'PATCH', body.workingHours);
      return request('/shop/me', 'PATCH', { holidays: body.holidays });
    }
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), config.timeout);
    try {
      const form = body instanceof FormData;
      const r = await fetch(config.baseURL + path, {
        method,
        credentials: 'include',
        signal: controller.signal,
        headers: form ? {} : { 'Content-Type': 'application/json' },
        body:
          body === undefined ? undefined : form ? body : JSON.stringify(body),
      });
      if (r.status === 401 && path === '/auth/me') return null;
      const data = await r.json().catch(() => {
        throw Object.assign(
          new Error('Server returned an invalid response. Please try again.'),
          { status: r.status },
        );
      });
      if (!r.ok)
        throw Object.assign(new Error(data.message || 'Request failed'), {
          status: r.status,
        });
      if (path === '/earnings')
        return { ...data, orders: await request('/orders') };
      if (path === '/rewards')
        return { ...data, history: data.history || data.ledger || [] };
      return data;
    } catch (e) {
      if (e.name === 'AbortError')
        throw new Error('Request timed out. Check your connection and retry.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  const task = queue.then(async () => {
    if (!state) {
      const raw = await AsyncStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : seed();
    }
    const next = clone(state);
    const result = mock(next, path, method, body || {});
    if (method !== 'GET') {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      state = next;
    }
    return clone(result);
  });
  queue = task.catch(() => {});
  return task;
}
function mock(s, path, method, b) {
  const p = path.split('?')[0].split('/').filter(Boolean),
    fail = message => {
      throw new Error(message);
    };
  const notify = (title, category = 'System', orderId) =>
    s.notifications.unshift({
      id: uid(),
      title,
      category,
      orderId,
      read: false,
      createdAt: stamp(),
    });
  if (path === '/auth/me')
    return s.session ? { user: s.user, shop: s.shop } : null;
  if (path === '/auth/demo' || path === '/auth/login') {
    if (
      path.endsWith('login') &&
      (String(b.phone || '')
        .replace(/\D/g, '')
        .replace(/^92/, '0') !== '03001234567' ||
        b.password !== 'ZestDemo123')
    )
      fail(
        'Demo credentials: 03001234567 / ZestDemo123. Real accounts require your backend.',
      );
    s.session = true;
    s.lastLogin = stamp();
    return { user: s.user, shop: s.shop };
  }
  if (path === '/auth/register') {
    s.user = { fullName: b.fullName, phone: b.phone };
    s.shop = {
      ...s.shop,
      shopName: b.shopName,
      address: b.address,
      verificationStatus: 'Pending',
    };
    s.session = true;
    s.lastLogin = stamp();
    return { user: s.user, shop: s.shop };
  }
  if (path === '/auth/recover-password')
    return {
      message:
        'Demo only: no SMS sent. Connect your recovery API to enable password recovery.',
    };
  if (path === '/auth/logout') {
    s.session = false;
    return { ok: true };
  }
  if (!s.session)
    throw Object.assign(new Error('Please log in again'), { status: 401 });
  if (path === '/auth/change-password')
    fail(
      'Secure password changes require your authentication backend. Local demo stores no passwords.',
    );
  if (path === '/auth/sessions')
    return [
      {
        id: 'current',
        device: 'Current device · local demo',
        current: true,
        createdAt: s.lastLogin || stamp(),
      },
    ];
  if (p[0] === 'shop') {
    if (path === '/shop/verification') {
      s.verification ||= [];
      if (method === 'POST') {
        if (!b.shopName?.trim()) fail('Shop name is required');
        s.verification.unshift({
          id: uid(),
          shopName: b.shopName,
          document: b.document || '',
          status: 'Pending',
          createdAt: stamp(),
        });
        notify('Verification request submitted');
      }
      return { status: s.shop.verificationStatus, requests: s.verification };
    }
    if (method === 'PATCH') {
      s.shop = { ...s.shop, ...b };
      notify('Shop settings updated');
    }
    return s.shop;
  }
  if (p[0] === 'products') {
    if (method === 'GET')
      return p[1]
        ? s.products.find(x => x.id === p[1]) || fail('Product not found')
        : s.products;
    const old = s.products.find(x => x.id === p[1]);
    if (p[1] && !old) fail('Product not found');
    if (method === 'DELETE') {
      if (
        s.orders.some(
          o =>
            ['Accepted', 'Preparing', 'Ready for Pickup'].includes(o.status) &&
            o.items.some(i => i.productId === p[1]),
        )
      )
        fail('Product belongs to an active order. Complete it first.');
      if (!old) fail('Product not found');
      s.products = s.products.filter(x => x.id !== p[1]);
    } else {
      if (
        !b.name?.trim() ||
        !Number.isFinite(b.pricePkr) ||
        b.pricePkr <= 0 ||
        !Number.isInteger(b.quantity) ||
        b.quantity < 0 ||
        b.quantity < (old?.reserved || 0)
      )
        fail(
          'Enter a name, positive price and stock at least equal to reserved quantity.',
        );
      const product = {
        ...old,
        ...b,
        id: old?.id || uid(),
        reserved: old?.reserved || 0,
      };
      if (old)
        s.products = s.products.map(x => (x.id === old.id ? product : x));
      else s.products.unshift(product);
    }
    s.logs.unshift({
      id: uid(),
      productName: old?.name || b.name,
      actionType: method === 'DELETE' ? 'Removed' : old ? 'Updated' : 'Added',
      previousQuantity: old?.quantity || 0,
      newQuantity: method === 'DELETE' ? 0 : b.quantity,
      timestamp: stamp(),
    });
    return { ok: true };
  }
  if (path === '/inventory/history') return s.logs;
  if (path === '/demo/orders' && method === 'POST') {
    if (s.shop.status === 'closed') fail('Reopen your shop to receive orders.');
    if (
      s.shop.status === 'busy' &&
      s.orders.filter(o =>
        ['New', 'Accepted', 'Preparing', 'Ready for Pickup'].includes(o.status),
      ).length >= 5
    )
      fail('Busy shop capacity reached.');
    const product = s.products.find(
      x => x.isAvailable && x.quantity - x.reserved > 0,
    );
    if (!product) fail('Add available stock first.');
    const o = {
      ...seed().orders[0],
      id: `ZB${uid()}`,
      items: [
        {
          productId: product.id,
          name: product.name,
          price: product.pricePkr,
          quantity: 1,
          emoji: product.emoji,
        },
      ],
      subtotal: product.pricePkr,
      total: product.pricePkr + 100,
      createdAt: stamp(),
    };
    o.orderNumber = o.id;
    s.orders.unshift(o);
    notify('New order received', 'Orders', o.id);
    return o;
  }
  if (p[0] === 'orders') {
    const o = s.orders.find(x => x.id === p[1]);
    if (method === 'GET') return p[1] ? o || fail('Order not found') : s.orders;
    if (!o) fail('Order not found');
    const action = p[2],
      expected = {
        accept: 'New',
        reject: 'New',
        'start-preparing': 'Accepted',
        'confirm-packing': 'Preparing',
        'verify-pickup-otp': 'Ready for Pickup',
        deliver: 'Handed Over',
      };
    if (o.status !== expected[action])
      fail('Order has changed. Refresh and retry.');
    if (action === 'accept') {
      if (s.shop.status === 'closed') fail('Reopen shop before accepting.');
      for (const i of o.items) {
        const product = s.products.find(x => x.id === i.productId);
        if (
          !product ||
          !product.isAvailable ||
          product.quantity - product.reserved < i.quantity
        )
          fail(`Insufficient stock: ${i.name}`);
      }
      for (const i of o.items)
        s.products.find(x => x.id === i.productId).reserved += i.quantity;
      o.status = 'Accepted';
    }
    if (action === 'reject') {
      if (!b.reason?.trim()) fail('Enter a reason');
      o.status = 'Rejected';
      o.rejectionReason = b.reason;
      o.customerResolution =
        'Customer approval required: switch affected items to another shop or remove this segment. Other shops remain active.';
    }
    if (action === 'start-preparing') {
      o.status = 'Preparing';
      o.preparationStartedAt = stamp();
    }
    if (action === 'confirm-packing') {
      if (!o.items.every(i => b.checkedItems?.includes(i.productId)))
        fail('Check every item first.');
      o.status = 'Ready for Pickup';
    }
    if (action === 'verify-pickup-otp') {
      if (o.otpAttempts >= 5) fail('Too many attempts. Contact support.');
      if (b.otp !== '4587') {
        o.otpAttempts = (o.otpAttempts || 0) + 1;
        return { error: 'Incorrect demo OTP', attempts: o.otpAttempts };
      }
      for (const i of o.items) {
        const product = s.products.find(x => x.id === i.productId);
        if (
          !product ||
          product.quantity < i.quantity ||
          product.reserved < i.quantity
        )
          fail('Inventory reservation mismatch. Contact support.');
        product.quantity -= i.quantity;
        product.reserved -= i.quantity;
        s.logs.unshift({
          id: uid(),
          productName: product.name,
          actionType: 'Updated',
          previousQuantity: product.quantity + i.quantity,
          newQuantity: product.quantity,
          timestamp: stamp(),
        });
      }
      o.status = 'Handed Over';
      s.points += 2;
      s.rewards.unshift({
        id: uid(),
        points: 2,
        orderId: o.id,
        createdAt: stamp(),
      });
    }
    if (action === 'deliver') {
      o.status = 'Delivered';
      o.paymentStatus = 'Paid';
      s.transactions.unshift({
        id: uid(),
        orderId: o.id,
        amount: o.subtotal,
        commission: Math.round(o.subtotal * 0.1),
        settlementAmount: o.subtotal - Math.round(o.subtotal * 0.1),
        settled: false,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        createdAt: stamp(),
        isDemoTransaction: true,
      });
    }
    o.updatedAt = stamp();
    notify(`Order ${o.status.toLowerCase()}`, 'Orders', o.id);
    return o;
  }
  if (path === '/earnings' || path.startsWith('/reports/sales'))
    return { transactions: s.transactions, orders: s.orders };
  if (path === '/rewards') return { points: s.points, history: s.rewards };
  if (p[0] === 'notifications') {
    if (method !== 'GET')
      s.notifications.forEach(n => {
        if (p[1] === 'read-all' || n.id === p[1]) n.read = true;
      });
    return s.notifications;
  }
  if (p[0] === 'support') {
    const t = s.tickets.find(x => x.id === p[2]);
    if (p[3] === 'messages') {
      if (!t) fail('Ticket not found');
      if (method === 'POST') {
        if (!b.body?.trim()) fail('Enter a message');
        t.messages.push({
          id: uid(),
          author: 'You',
          body: b.body,
          createdAt: stamp(),
        });
      }
      return t.messages;
    }
    if (method === 'POST') {
      if (
        !b.subject?.trim() ||
        !b.description ||
        b.description.trim().length < 10
      )
        fail('Subject and description (10 characters) required');
      s.tickets.unshift({
        id: `CP${uid()}`,
        subject: b.subject,
        attachment: b.attachment || '',
        status: 'In Progress',
        createdAt: stamp(),
        messages: [
          { id: uid(), author: 'You', body: b.description, createdAt: stamp() },
        ],
      });
    }
    return s.tickets;
  }
  fail(`Endpoint not implemented: ${path}`);
}
