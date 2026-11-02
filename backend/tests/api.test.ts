import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Repository } from '../src/store.js';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zestbasket-test-'));
let server: Awaited<ReturnType<typeof createApp>>;
let agent: ReturnType<typeof request.agent>;
let second: ReturnType<typeof request.agent>;
let productId = '';
let orderId = '';
before(async () => {
  process.env.DEMO_MODE = 'true';
  server = await createApp(new Repository(path.join(dir, 'store.json')));
  agent = request.agent(server.app);
  second = request.agent(server.app);
});
after(async () => {
  server.io.close();
  server.http.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
test('protected routes reject missing session', async () => {
  await request(server.app).get('/api/products').expect(401);
});
test('invalid registration fails and valid registration/login creates a pending shop', async () => {
  await second.post('/api/auth/register').send({ phone: '123' }).expect(400);
  await second
    .post('/api/auth/register')
    .send({
      fullName: 'Test Owner',
      phone: '03111234567',
      cnic: '35202-7654321-2',
      password: 'Testing123',
      shopName: 'Test Mart',
      address: 'Test street, Lahore',
    })
    .expect(201);
  await second
    .post('/api/auth/login')
    .send({ phone: '03111234567', password: 'wrong' })
    .expect(401);
  const r = await second
    .post('/api/auth/login')
    .send({ phone: '+923111234567', password: 'Testing123' })
    .expect(200);
  assert.equal(r.body.shop.verificationStatus, 'Pending');
  assert.equal(r.body.user.passwordHash, undefined);
});
test('demo login and authenticated session', async () => {
  await agent.post('/api/auth/demo').expect(200);
  const r = await agent.get('/api/auth/me').expect(200);
  assert.equal(r.body.shop.shopName, 'FreshMart');
});
test('owner cannot access another shop records', async () => {
  await second.get('/api/orders/ZB10045').expect(404);
  await second.patch('/api/products/flour').send({ quantity: 100 }).expect(404);
});
test('product validation, CRUD, search, category filters, stock log and deletion', async () => {
  await agent.post('/api/products').send({ name: 'Invalid' }).expect(400);
  const r = await agent
    .post('/api/products')
    .send({
      name: 'Apples',
      category: 'Fruits',
      pricePkr: 220,
      quantity: 10,
      unit: 'kg',
      description: 'Fresh apples',
      isAvailable: true,
      imageUrl: '',
    })
    .expect(201);
  productId = r.body.id;
  await agent
    .patch('/api/products/' + productId)
    .send({ pricePkr: 240, quantity: 12 })
    .expect(200);
  const found = await agent
    .get('/api/products?q=apple&category=Fruits')
    .expect(200);
  assert.equal(found.body.length, 1);
  assert.equal(found.body[0].quantity, 12);
  await agent
    .post('/api/products/' + productId + '/adjust-stock')
    .send({ change: -20 })
    .expect(409);
  await agent
    .post('/api/products/' + productId + '/adjust-stock')
    .send({ change: 3 })
    .expect(200);
  const history = await agent.get('/api/inventory/history').expect(200);
  assert.ok(
    history.body.items.some(
      (l: any) => l.productId === productId && l.actionType === 'Restocked',
    ),
  );
  await agent.delete('/api/products/' + productId).expect(200);
  await agent.get('/api/products/' + productId).expect(404);
  await agent.delete('/api/products/flour').expect(409);
});
test('uploads reject disguised images and accept valid PNG signature', async () => {
  await agent
    .post('/api/uploads')
    .attach('image', Buffer.from('not a real PNG'), {
      filename: 'fake.png',
      contentType: 'image/png',
    })
    .expect(400);
});
test('order acceptance is atomic and duplicate clicks do not reserve twice', async () => {
  const before = (await agent.get('/api/products/flour')).body;
  const results = await Promise.all([
    agent.post('/api/orders/ZB10045/accept'),
    agent.post('/api/orders/ZB10045/accept'),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const after = (await agent.get('/api/products/flour')).body;
  assert.equal(after.reserved, before.reserved + 2);
  assert.equal(after.quantity, before.quantity);
  await agent.patch('/api/products/flour').send({ quantity: 0 }).expect(409);
});
test('packing checklist, timer, stock deduction, wrong/correct/replayed OTP, reward', async () => {
  await agent
    .post('/api/orders/ZB10045/verify-pickup-otp')
    .send({ otp: '4587' })
    .expect(409);
  const p = await agent.post('/api/orders/ZB10045/start-preparing').expect(200);
  assert.ok(p.body.preparationStartedAt);
  await agent
    .post('/api/orders/ZB10045/confirm-packing')
    .send({ items: [] })
    .expect(400);
  const items = p.body.items.map((i: any) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));
  await agent
    .post('/api/orders/ZB10045/confirm-packing')
    .send({ items })
    .expect(200);
  await agent
    .post('/api/orders/ZB10045/confirm-packing')
    .send({ items })
    .expect(409);
  const flour = (await agent.get('/api/products/flour')).body;
  assert.equal(flour.quantity, 43);
  assert.equal(flour.reserved, 0);
  await agent
    .post('/api/orders/ZB10045/verify-pickup-otp')
    .send({ otp: '1111' })
    .expect(400);
  await agent
    .post('/api/orders/ZB10045/verify-pickup-otp')
    .send({ otp: '4587' })
    .expect(200);
  await agent
    .post('/api/orders/ZB10045/verify-pickup-otp')
    .send({ otp: '4587' })
    .expect(409);
  assert.equal(
    (await agent.get('/api/rewards')).body.ledger.filter(
      (l: any) => l.orderId === 'ZB10045',
    ).length,
    1,
  );
});
test('PDF receipt, demo delivery, ledger reconciliation and date range', async () => {
  const pdf = await agent
    .get('/api/orders/ZB10045/receipt?format=pdf')
    .expect(200);
  assert.match(pdf.headers['content-type'], /application\/pdf/);
  const old = (await agent.get('/api/earnings')).body;
  await agent.post('/api/demo/orders/ZB10045/deliver').expect(200);
  await agent.post('/api/demo/orders/ZB10045/deliver').expect(409);
  const f = (await agent.get('/api/earnings')).body;
  assert.equal(f.totalSales - old.totalSales, 1400);
  assert.equal(f.earnings + f.commission, f.totalSales);
  const report = (await agent.get('/api/reports/sales')).body;
  assert.equal(report.totalSales, f.totalSales);
  const empty = (
    await agent.get('/api/reports/sales?from=2000-01-01&to=2000-01-02')
  ).body;
  assert.equal(empty.totalSales, 0);
});
test('rejection requires reason and preserves customer switch/drop choices', async () => {
  await agent
    .post('/api/orders/ZB10044/reject')
    .send({ reason: 'no' })
    .expect(400);
  const r = await agent
    .post('/api/orders/ZB10044/reject')
    .send({ reason: 'Fresh tomatoes are unavailable' })
    .expect(200);
  assert.equal(r.body.status, 'Rejected');
  assert.equal(r.body.customerResolution.choices.length, 2);
  assert.ok(
    !r.body.customerResolution.choices.some((s: string) =>
      s.includes('cancel'),
    ),
  );
});
test('closed shop rejects new assignments and reopening resumes them', async () => {
  await agent.patch('/api/shop/status').send({ status: 'closed' }).expect(200);
  await agent.post('/api/demo/orders').expect(409);
  await agent.get('/api/orders').expect(200);
  await agent.patch('/api/shop/status').send({ status: 'active' }).expect(200);
  const r = await agent.post('/api/demo/orders').expect(201);
  orderId = r.body.id;
});
test('profile, hours, holidays and pending verification persistence', async () => {
  await agent.patch('/api/shop/me').send({ deliveryRadiusKm: 6 }).expect(400);
  await agent
    .patch('/api/shop/me')
    .send({
      address: 'New address, Lahore',
      deliveryRadiusKm: 4,
      holidays: ['2026-12-25'],
    })
    .expect(200);
  await agent
    .patch('/api/shop/hours')
    .send({ Mon: { open: '09:00', close: '22:00' } })
    .expect(200);
  await agent
    .post('/api/shop/verification')
    .send({ shopName: 'FreshMart Plus' })
    .expect(201);
  const r = await agent.get('/api/shop/me');
  assert.equal(r.body.shopName, 'FreshMart');
  assert.equal(r.body.workingHours.Mon.open, '09:00');
  assert.equal(
    (await agent.get('/api/shop/verification')).body.requests[0].status,
    'Pending',
  );
});
test('support tickets, messages and ownership', async () => {
  const r = await agent
    .post('/api/support/tickets')
    .send({
      subject: 'Order assistance',
      issueType: 'Order Issue',
      description: 'Please help with this demo order.',
      orderId,
    })
    .expect(201);
  await agent
    .post('/api/support/tickets/' + r.body.id + '/messages')
    .send({ body: 'An additional detail' })
    .expect(201);
  const messages = await agent
    .get('/api/support/tickets/' + r.body.id + '/messages')
    .expect(200);
  assert.equal(messages.body.length, 2);
  await second
    .get('/api/support/tickets/' + r.body.id + '/messages')
    .expect(404);
});
test('notifications read state persists and counts reconcile', async () => {
  const r = await agent.get('/api/notifications');
  assert.ok(r.body.some((n: any) => !n.read));
  await agent.patch('/api/notifications/' + r.body[0].id + '/read').expect(200);
  await agent.post('/api/notifications/read-all').expect(200);
  assert.equal((await agent.get('/api/dashboard/summary')).body.unread, 0);
});
test('file data survives a repository restart', async () => {
  const reopened = new Repository(path.join(dir, 'store.json'));
  await reopened.init();
  assert.equal(
    reopened.data.orders.find(o => o.id === 'ZB10045')?.status,
    'Delivered',
  );
  assert.equal(reopened.data.shops[0].deliveryRadiusKm, 4);
});
test('password change, session revocation and logout invalidate access', async () => {
  await second
    .post('/api/auth/change-password')
    .send({ currentPassword: 'wrong', newPassword: 'NewTesting123' })
    .expect(400);
  await second
    .post('/api/auth/change-password')
    .send({ currentPassword: 'Testing123', newPassword: 'NewTesting123' })
    .expect(200);
  const other = request.agent(server.app);
  await other
    .post('/api/auth/login')
    .send({ phone: '03111234567', password: 'NewTesting123' })
    .expect(200);
  const sessions = (await second.get('/api/auth/sessions')).body;
  const otherSession = sessions.find((s: any) => !s.current);
  await second.delete('/api/auth/sessions/' + otherSession.id).expect(200);
  await other.get('/api/auth/me').expect(401);
  await second.post('/api/auth/logout').expect(200);
  await second.get('/api/auth/me').expect(401);
});
test('uploaded product images are private to their owning shop',async()=>{const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4l8AAAAASUVORK5CYII=','base64');const r=await agent.post('/api/uploads').attach('image',png,{filename:'pixel.png',contentType:'image/png'}).expect(201);await agent.get(r.body.url).expect(200);await second.post('/api/auth/login').send({phone:'03111234567',password:'NewTesting123'}).expect(200);await second.get(r.body.url).expect(404);fs.rmSync(path.resolve('uploads',path.basename(r.body.url)),{force:true});});
