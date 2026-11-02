import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import multer from 'multer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { Repository, id, now, Row, Store } from './store.js';
import { multiShopFee, pickupBatches } from './services/business.js';
const password = z
  .string()
  .min(8)
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/[0-9]/, 'Include a number');
const phone = z
  .string()
  .transform(v => v.replace(/\D/g, '').replace(/^92/, '0'))
  .pipe(z.string().regex(/^03\d{9}$/, 'Enter a valid Pakistani mobile number'));
const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum([
    'Fruits',
    'Vegetables',
    'Dairy',
    'Bakery',
    'Grocery',
    'Others',
  ]),
  pricePkr: z.number().positive().max(1000000),
  quantity: z.number().int().min(0).max(1000000),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'pack']),
  description: z.string().max(2000).default(''),
  imageUrl: z
    .string()
    .regex(/^(\/uploads\/[a-f0-9-]+\.(png|jpg|webp))?$|^$/)
    .default(''),
  isAvailable: z.boolean().default(true),
  lowStockThreshold: z.number().int().min(0).default(5),
});
export async function createApp(repo = new Repository()) {
  await repo.init();
  const app = express(),
    http = createServer(app),
    origin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
    demo = process.env.DEMO_MODE !== 'false';
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET)
    throw Error('JWT_SECRET required in production');
  const secret =
    process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
  const io = new Server(http, { cors: { origin, credentials: true } });
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== origin
    )
      return res.status(403).json({ message: 'Untrusted request origin' });
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  const authLimit = rateLimit({ windowMs: 15 * 60000, limit: 40 });
  const fail = (status: number, message: string) => {
    throw Object.assign(new Error(message), { status });
  };
  const wrap = (fn: Function) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res)).catch(next);
  const tokenUser = (token?: string) => {
    if (!token) return null;
    try {
      const claims = jwt.verify(token, secret) as any;
      const session = repo.data.sessions.find(
        s =>
          s.id === claims.sid &&
          !s.revoked &&
          Date.parse(s.expiresAt) > Date.now(),
      );
      return session ? repo.data.users.find(u => u.id === claims.sub) : null;
    } catch {
      return null;
    }
  };
  const auth = (req: any, res: any, next: any) => {
    req.user = tokenUser(req.cookies.zest_session);
    if (!req.user)
      return res.status(401).json({ message: 'Please log in to continue' });
    req.shop = repo.data.shops.find(s => s.ownerId === req.user.id);
    if (req.user.role !== 'shopkeeper' || !req.shop)
      return res.status(403).json({ message: 'Shopkeeper access required' });
    next();
  };
  const publicUser = (u: Row) => ({
    id: u.id,
    fullName: u.fullName,
    phone: u.phone,
    cnic: u.cnic.replace(/\d(?=.{4})/g, 'X'),
    createdAt: u.createdAt,
  });
  const login = async (req: any, res: any, u: Row) => {
    const sid = id();
    await repo.mutate(d => {
      d.sessions.push({
        id: sid,
        userId: u.id,
        device: req.headers['user-agent'] || 'Unknown device',
        createdAt: now(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        revoked: false,
      });
    });
    const token = jwt.sign({ sub: u.id, sid }, secret, { expiresIn: '7d' });
    res.cookie('zest_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 86400000,
      path: '/',
    });
    res.json({
      user: publicUser(u),
      shop: repo.data.shops.find(s => s.ownerId === u.id),
    });
  };
  const own = (d: Store, key: keyof Store, rowId: string, shopId: string) => {
    const row = d[key].find(r => r.id === rowId && r.shopId === shopId);
    if (!row) fail(404, 'Record not found');
    return row!;
  };
  const emit = (shopId: string, event: string, data: any) =>
    io.to(shopId).emit(event, data);
  const notice = (
    d: Store,
    shopId: string,
    title: string,
    detail: string,
    href: string,
    category = 'Orders',
  ) => {
    const n = {
      id: id(),
      shopId,
      title,
      detail,
      href,
      category,
      read: false,
      createdAt: now(),
    };
    d.notifications.unshift(n);
    return n;
  };
  const log = (d: Store, p: Row, old: number, actionType: string) =>
    d.logs.unshift({
      id: id(),
      shopId: p.shopId,
      productId: p.id,
      productName: p.name,
      actionType,
      previousQuantity: old,
      newQuantity: p.quantity,
      quantityChange: p.quantity - old,
      timestamp: now(),
    });
  const cleanOrder = (o: Row) => {
    const { pickupOtpHash, otpAttempts, ...safe } = o;
    return safe;
  };
  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      persistence: process.env.MONGODB_URI ? 'MongoDB' : 'local-file',
      demoMode: demo,
    }),
  );
  app.post(
    '/api/auth/register',
    authLimit,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({
          fullName: z.string().trim().min(2),
          phone,
          cnic: z.string().regex(/^\d{5}-\d{7}-\d$/),
          password,
          shopName: z.string().trim().min(2),
          address: z.string().trim().min(8),
        })
        .parse(req.body);
      const hash = await bcrypt.hash(b.password, 12);
      await repo.mutate(d => {
        if (d.users.some(u => u.phone === b.phone || u.cnic === b.cnic))
          fail(409, 'Phone or CNIC already registered');
        const uid = id();
        d.users.push({
          id: uid,
          fullName: b.fullName,
          phone: b.phone,
          cnic: b.cnic,
          passwordHash: hash,
          role: 'shopkeeper',
          createdAt: now(),
        });
        d.shops.push({
          id: id(),
          ownerId: uid,
          shopName: b.shopName,
          address: b.address,
          status: 'active',
          verificationStatus: 'Pending',
          deliveryRadiusKm: 5,
          capacity: 5,
          holidays: [],
          workingHours: Object.fromEntries(
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => [
              x,
              { open: '08:00', close: '23:00' },
            ]),
          ),
        });
      });
      res.status(201).json({
        message: 'Shop registered. Please log in. Verification is pending.',
      });
    }),
  );
  app.post(
    '/api/auth/login',
    authLimit,
    wrap(async (req: any, res: any) => {
      const b = z.object({ phone, password: z.string() }).parse(req.body),
        u = repo.data.users.find(u => u.phone === b.phone);
      if (!u || !(await bcrypt.compare(b.password, u.passwordHash)))
        fail(401, 'Incorrect phone number or password');
      await login(req, res, u!);
    }),
  );
  app.post(
    '/api/auth/demo',
    authLimit,
    wrap(async (req: any, res: any) => {
      if (!demo) fail(404, 'Demo disabled');
      await login(req, res, repo.data.users.find(u => u.id === 'demo-owner')!);
    }),
  );
  app.post(
    '/api/auth/recover-password',
    authLimit,
    wrap(async (req: any, res: any) => {
      const b = z.object({ phone }).parse(req.body);
      res.json({
        message: demo
          ? 'Demo recovery: contact the event administrator. Demo account: 03001234567 / ZestDemo123. No password was changed.'
          : 'Recovery request recorded. Contact support to verify your identity.',
      });
      await repo.mutate(d => {
        const u = d.users.find(u => u.phone === b.phone);
        if (u) {
          const s = d.shops.find(s => s.ownerId === u.id);
          d.tickets.push({
            id: id(),
            shopId: s?.id,
            subject: 'Account recovery requested',
            description: 'Identity verification required; no reset performed.',
            status: 'Open',
            createdAt: now(),
            messages: [],
          });
        }
      });
    }),
  );
  app.get('/api/auth/me', auth, (req: any, res) =>
    res.json({ user: publicUser(req.user), shop: req.shop, demoMode: demo }),
  );
  app.post(
    '/api/auth/logout',
    auth,
    wrap(async (req: any, res: any) => {
      const claims = jwt.verify(req.cookies.zest_session, secret) as any;
      await repo.mutate(d => {
        const s = d.sessions.find(s => s.id === claims.sid);
        if (s) s.revoked = true;
      });
      io.in('session:'+claims.sid).disconnectSockets(true);
      res
        .clearCookie('zest_session', { path: '/' })
        .json({ message: 'Logged out' });
    }),
  );
  app.post(
    '/api/auth/refresh',
    auth,
    wrap(async (req: any, res: any) => {
      const claims = jwt.verify(req.cookies.zest_session, secret) as any;
      await repo.mutate(d=>{const current=d.sessions.find(s=>s.id===claims.sid);if(current)current.expiresAt=new Date(Date.now()+7*86400000).toISOString();});
      res
        .cookie(
          'zest_session',
          jwt.sign({ sub: req.user.id, sid: claims.sid }, secret, {
            expiresIn: '7d',
          }),
          {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 86400000,
            path: '/',
          },
        )
        .json({ message: 'Session refreshed' });
    }),
  );
  app.post(
    '/api/auth/change-password',
    auth,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({ currentPassword: z.string(), newPassword: password })
        .parse(req.body);
      if (!(await bcrypt.compare(b.currentPassword, req.user.passwordHash)))
        fail(400, 'Current password is incorrect');
      const hash = await bcrypt.hash(b.newPassword, 12);
      await repo.mutate(d => {
        d.users.find(u => u.id === req.user.id)!.passwordHash = hash;
        const claims = jwt.verify(req.cookies.zest_session, secret) as any;
        d.sessions
          .filter(s => s.userId === req.user.id && s.id !== claims.sid)
          .forEach(s => (s.revoked = true));
      });
      res.json({ message: 'Password changed; other sessions revoked' });
    }),
  );
  app.get('/api/auth/sessions', auth, (req: any, res) => {
    const claims = jwt.verify(req.cookies.zest_session, secret) as any;
    res.json(
      repo.data.sessions
        .filter(s => s.userId === req.user.id && !s.revoked)
        .map(s => ({ ...s, current: s.id === claims.sid })),
    );
  });
  app.delete(
    '/api/auth/sessions/:id',
    auth,
    wrap(async (req: any, res: any) => {
      const claims = jwt.verify(req.cookies.zest_session, secret) as any;
      if (claims.sid === req.params.id)
        fail(400, 'Use Logout for the current session');
      await repo.mutate(d => {
        const s = d.sessions.find(
          s => s.id === req.params.id && s.userId === req.user.id,
        );
        if (!s) fail(404, 'Session not found');
        s!.revoked = true;
      });
      io.in('session:'+req.params.id).disconnectSockets(true);
      res.json({ message: 'Session revoked' });
    }),
  );
  app.get('/api/shop/me', auth, (req: any, res) => res.json(req.shop));
  app.patch(
    '/api/shop/me',
    auth,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({
          address: z.string().min(8).optional(),
          deliveryRadiusKm: z.number().positive().max(5).optional(),
          holidays: z.array(z.string().date()).max(60).optional(),
          shopAvatar: z
            .string()
            .regex(/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp)$/)
            .optional(),
        })
        .parse(req.body);
      await repo.mutate(d =>
        Object.assign(d.shops.find(s => s.id === req.shop.id)!, b),
      );
      emit(req.shop.id, 'shop:status', req.shop);
      res.json(repo.data.shops.find(s => s.id === req.shop.id));
    }),
  );
  app.patch(
    '/api/shop/hours',
    auth,
    wrap(async (req: any, res: any) => {
      const hours = z
        .record(
          z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
          z.object({
            open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          }),
        )
        .parse(req.body);
      await repo.mutate(d => {
        d.shops.find(s => s.id === req.shop.id)!.workingHours = hours;
      });
      res.json({ message: 'Operating hours updated' });
    }),
  );
  app.patch(
    '/api/shop/status',
    auth,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({ status: z.enum(['active', 'busy', 'closed']) })
        .parse(req.body);
      await repo.mutate(d => {
        d.shops.find(s => s.id === req.shop.id)!.status = b.status;
        notice(
          d,
          req.shop.id,
          'Shop status updated',
          b.status,
          '/shop/status',
          'System',
        );
      });
      emit(req.shop.id, 'shop:status', b);
      res.json({ message: 'Shop status saved', ...b });
    }),
  );
  app.get('/api/shop/verification', auth, (req: any, res) =>
    res.json({
      status: req.shop.verificationStatus,
      requests: repo.data.verification.filter(r => r.shopId === req.shop.id),
    }),
  );
  app.post(
    '/api/shop/verification',
    auth,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({
          shopName: z.string().min(2).max(80),
          document: z
            .string()
            .regex(/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp)$/)
            .optional(),
        })
        .parse(req.body);
      await repo.mutate(d =>
        d.verification.push({
          id: id(),
          shopId: req.shop.id,
          ...b,
          status: 'Pending',
          createdAt: now(),
        }),
      );
      res
        .status(201)
        .json({ message: 'Request submitted for administrator review' });
    }),
  );
  const uploadDir = path.resolve('uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_r, file, cb) =>
      cb(
        null,
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype),
      ),
  });
  app.post(
    '/api/uploads',
    auth,
    upload.single('image'),
    wrap(async (req: any, res: any) => {
      const f = req.file;
      if (!f) fail(400, 'Choose a PNG, JPEG or WebP image, up to 5 MB');
      const b = f.buffer;
      let ext = '';
      if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') ext = 'png';
      else if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ext = 'jpg';
      else if (
        b.toString('ascii', 0, 4) === 'RIFF' &&
        b.toString('ascii', 8, 12) === 'WEBP'
      )
        ext = 'webp';
      if (!ext) fail(400, 'Invalid image content');
      const name = id() + '.' + ext;
      fs.writeFileSync(path.join(uploadDir, name), b);
      await repo.mutate(d =>
        d.uploads.push({
          id: name,
          name,
          shopId: req.shop.id,
          mimeType: f.mimetype,
          createdAt: now(),
        }),
      );
      res.status(201).json({ url: '/uploads/' + name });
    }),
  );
  app.use(
    '/uploads',
    auth,
    (req: any, res, next) => {
      if (
        !repo.data.uploads.some(
          u => u.name === req.path.slice(1) && u.shopId === req.shop.id,
        )
      )
        return res.status(404).json({ message: 'Image not found' });
      next();
    },
    express.static(uploadDir, { dotfiles: 'deny' }),
  );
  app.get('/api/products', auth, (req: any, res) => {
    let rows = repo.data.products.filter(p => p.shopId === req.shop.id);
    if (req.query.q)
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(String(req.query.q).toLowerCase()),
      );
    if (req.query.category && req.query.category !== 'All')
      rows = rows.filter(p => p.category === req.query.category);
    res.json(rows);
  });
  app.get(
    '/api/products/:id',
    auth,
    wrap((req: any, res: any) =>
      res.json(own(repo.data, 'products', req.params.id, req.shop.id)),
    ),
  );
  app.post(
    '/api/products',
    auth,
    wrap(async (req: any, res: any) => {
      const b = productSchema.parse(req.body);
      const p = await repo.mutate(d => {
        const p = {
          ...b,
          id: id(),
          shopId: req.shop.id,
          reserved: 0,
          createdAt: now(),
        };
        d.products.push(p);
        log(d, p, 0, 'Added');
        return p;
      });
      emit(req.shop.id, 'inventory:updated', p);
      res.status(201).json(p);
    }),
  );
  app.patch(
    '/api/products/:id',
    auth,
    wrap(async (req: any, res: any) => {
      const b = productSchema.partial().parse(req.body);
      const p = await repo.mutate(d => {
        const p = own(d, 'products', req.params.id, req.shop.id),
          old = p.quantity;
        if (b.quantity !== undefined && b.quantity < p.reserved)
          fail(409, 'Stock cannot be less than reserved quantities');
        Object.assign(p, b);
        log(d, p, old, 'Updated');
        return p;
      });
      emit(req.shop.id, 'inventory:updated', p);
      res.json(p);
    }),
  );
  app.delete(
    '/api/products/:id',
    auth,
    wrap(async (req: any, res: any) => {
      await repo.mutate(d => {
        const p = own(d, 'products', req.params.id, req.shop.id);
        if (
          d.orders.some(
            o =>
              o.shopId === req.shop.id &&
              !['Rejected', 'Cancelled', 'Delivered'].includes(o.status) &&
              o.items.some((i: Row) => i.productId === p.id),
          )
        )
          fail(409, 'Product is required in an active order');
        const old = p.quantity;
        p.quantity = 0;
        log(d, p, old, 'Removed');
        d.products = d.products.filter(x => x.id !== p.id);
      });
      emit(req.shop.id, 'inventory:updated', {});
      res.json({ message: 'Product deleted' });
    }),
  );
  app.post(
    '/api/products/:id/adjust-stock',
    auth,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({ change: z.number().int().min(-1000000).max(1000000) })
        .parse(req.body);
      const p = await repo.mutate(d => {
        const p = own(d, 'products', req.params.id, req.shop.id),
          old = p.quantity;
        if (old + b.change < p.reserved)
          fail(409, 'Insufficient unreserved stock');
        p.quantity += b.change;
        log(d, p, old, b.change > 0 ? 'Restocked' : 'Updated');
        return p;
      });
      emit(req.shop.id, 'inventory:updated', p);
      res.json(p);
    }),
  );
  app.get('/api/inventory/history', auth, (req: any, res) => {
    const rows = repo.data.logs.filter(
      l =>
        l.shopId === req.shop.id &&
        (!req.query.action ||
          req.query.action === 'All' ||
          l.actionType === req.query.action),
    );
    const page = Math.max(1, Number(req.query.page) || 1);
    res.json({
      items: rows.slice((page - 1) * 15, page * 15),
      total: rows.length,
      page,
    });
  });
  app.get('/api/orders', auth, (req: any, res) =>
    res.json(
      repo.data.orders.filter(o => o.shopId === req.shop.id).map(cleanOrder),
    ),
  );
  app.get(
    '/api/orders/:id',
    auth,
    wrap((req: any, res: any) =>
      res.json(
        cleanOrder(own(repo.data, 'orders', req.params.id, req.shop.id)),
      ),
    ),
  );
  app.get(
    '/api/orders/:id/rider',
    auth,
    wrap((req: any, res: any) => {
      const o = own(repo.data, 'orders', req.params.id, req.shop.id);
      res.json({ rider: o.rider, status: o.status });
    }),
  );
  const transition = async (req: any, action: string) =>
    repo.mutate(d => {
      const o = own(d, 'orders', req.params.id, req.shop.id),
        b = req.body;
      if (action === 'accept') {
        if (o.status !== 'New') fail(409, 'Only new orders can be accepted');
        if (req.shop.status === 'closed')
          fail(409, 'Reopen your shop before accepting new orders');
        if (
          req.shop.status === 'busy' &&
          d.orders.filter(
            x =>
              x.shopId === req.shop.id &&
              ['Accepted', 'Preparing', 'Ready for Pickup'].includes(x.status),
          ).length >= req.shop.capacity
        )
          fail(409, 'Busy capacity reached');
        for (const i of o.items) {
          const p = own(d, 'products', i.productId, req.shop.id);
          if (!p.isAvailable || p.quantity - p.reserved < i.quantity)
            fail(409, 'Insufficient stock for ' + p.name);
          p.reserved += i.quantity;
        }
        o.status = 'Accepted';
      }
      if (action === 'reject') {
        if (o.status !== 'New') fail(409, 'Only new orders can be rejected');
        const reason = z.string().trim().min(5).max(500).parse(b.reason);
        o.status = 'Rejected';
        o.rejectionReason = reason;
        o.customerResolution = {
          status: 'Awaiting customer approval',
          choices: [
            'Switch affected items to another nearby shop',
            'Remove this shop and deliver remaining order',
          ],
        };
      }
      if (action === 'start-preparing') {
        if (o.status !== 'Accepted') fail(409, 'Accept the order first');
        o.status = 'Preparing';
        o.preparationStartedAt = now();
      }
      if (action === 'confirm-packing') {
        if (o.status !== 'Preparing') fail(409, 'Start preparation first');
        const packed = z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().int().min(0),
            }),
          )
          .parse(b.items);
        if (
          !o.items.every((i: Row) =>
            packed.some(
              p => p.productId === i.productId && p.quantity === i.quantity,
            ),
          )
        )
          fail(400, 'Confirm every item and quantity');
        for (const i of o.items) {
          const p = own(d, 'products', i.productId, req.shop.id),
            old = p.quantity;
          if (p.quantity < i.quantity || p.reserved < i.quantity)
            fail(409, 'Reserved inventory mismatch');
          p.quantity -= i.quantity;
          p.reserved -= i.quantity;
          log(d, p, old, 'Order fulfilled');
        }
        o.status = 'Ready for Pickup';
        o.packingTimestamp = now();
      }
      if (action === 'verify-pickup-otp') {
        if (o.status !== 'Ready for Pickup')
          fail(409, 'Order must be ready for pickup');
        if (o.otpAttempts >= 5)
          fail(429, 'OTP attempts exceeded. Contact support');
        if (Date.parse(o.otpExpiresAt) < Date.now())
          fail(400, 'Pickup OTP expired');
        const otp = z
          .string()
          .regex(/^\d{4}$/)
          .parse(b.otp);
        if (!bcrypt.compareSync(otp, o.pickupOtpHash)) {
          o.otpAttempts++;
          return { otpError: true };
        }
        o.status = 'Handed Over';
        o.handoverTimestamp = now();
        o.pickupOtpHash = '';
        if (!d.rewards.some(r => r.orderId === o.id)) {
          d.rewards.push({
            id: id(),
            shopId: req.shop.id,
            orderId: o.id,
            points:
              Date.now() - Date.parse(o.preparationStartedAt) < 600000 ? 2 : 1,
            reason: 'Order handover',
            createdAt: now(),
          });
        }
      }
      o.updatedAt = now();
      o.timestamps[o.status] = o.updatedAt;
      notice(
        d,
        req.shop.id,
        'Order ' + o.status.toLowerCase(),
        '#' + o.orderNumber,
        '/orders/' + o.id,
      );
      return cleanOrder(o);
    });
  [
    'accept',
    'reject',
    'start-preparing',
    'confirm-packing',
    'verify-pickup-otp',
  ].forEach(action =>
    app.post(
      '/api/orders/:id/' + action,
      auth,
      wrap(async (req: any, res: any) => {
        const o = await transition(req, action);
        if (o.otpError)
          return res.status(400).json({ message: 'Incorrect pickup OTP' });
        emit(req.shop.id, 'order:status', o);
        emit(req.shop.id, 'inventory:updated', {});
        emit(req.shop.id, 'notification:new', {});
        res.json(o);
      }),
    ),
  );
  app.get(
    '/api/orders/:id/receipt',
    auth,
    wrap((req: any, res: any) => {
      const o = own(repo.data, 'orders', req.params.id, req.shop.id);
      if (req.query.format !== 'pdf') return res.json(cleanOrder(o));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="receipt-' + o.orderNumber + '.pdf"',
      );
      const doc = new PDFDocument({ size: 'A5', margin: 35 });
      doc.pipe(res);
      doc
        .fillColor('#5708E8')
        .fontSize(24)
        .text('ZestBasket', { align: 'center' })
        .fontSize(9)
        .text('Fresh Groceries, Happier Homes', { align: 'center' })
        .moveDown(2);
      doc
        .fillColor('#27216C')
        .fontSize(12)
        .text('Order #' + o.orderNumber)
        .text(req.shop.shopName)
        .text(o.customer.name)
        .text(o.address)
        .moveDown();
      o.items.forEach((i: Row) =>
        doc
          .fontSize(10)
          .text(
            `${i.name} | ${i.quantity} x Rs. ${i.price} = Rs. ${
              i.quantity * i.price
            }`,
          )
          .moveDown(0.4),
      );
      doc
        .moveDown()
        .text('Subtotal: Rs. ' + o.subtotal)
        .text('Delivery: Rs. ' + o.deliveryFee)
        .text('Total: Rs. ' + o.total)
        .moveDown()
        .text('Payment: ' + o.paymentMethod + ' / ' + o.paymentStatus)
        .text('Status: ' + o.status)
        .text('Instructions: ' + o.instructions)
        .moveDown()
        .fontSize(8)
        .text(o.isDemo ? 'DEMO ORDER - no live payment processed' : '');
      doc.end();
    }),
  );
  const finances = (shopId: string, from?: string, to?: string) => {
    const tx = repo.data.transactions.filter(
      t =>
        t.shopId === shopId &&
        (!from || t.createdAt.slice(0, 10) >= from) &&
        (!to || t.createdAt.slice(0, 10) <= to),
    );
    return {
      transactions: tx,
      totalSales: tx.reduce((a, t) => a + t.amount, 0),
      commission: tx.reduce((a, t) => a + t.commission, 0),
      earnings: tx.reduce((a, t) => a + t.settlementAmount, 0),
      pending: tx
        .filter(t => !t.settled)
        .reduce((a, t) => a + t.settlementAmount, 0),
    };
  };
  app.get('/api/dashboard/summary', auth, (req: any, res) => {
    const orders = repo.data.orders.filter(o => o.shopId === req.shop.id);
    res.json({
      newOrders: orders.filter(o => o.status === 'New').length,
      activeOrders: orders.filter(o =>
        ['Accepted', 'Preparing', 'Ready for Pickup', 'Handed Over'].includes(
          o.status,
        ),
      ).length,
      todaySales: finances(req.shop.id, now().slice(0, 10)).totalSales,
      unread: repo.data.notifications.filter(
        n => n.shopId === req.shop.id && !n.read,
      ).length,
    });
  });
  app.get('/api/earnings', auth, (req: any, res) =>
    res.json(finances(req.shop.id, req.query.from, req.query.to)),
  );
  app.get('/api/earnings/transactions', auth, (req: any, res) =>
    res.json(finances(req.shop.id, req.query.from, req.query.to).transactions),
  );
  app.get('/api/reports/sales', auth, (req: any, res) => {
    const f = finances(req.shop.id, req.query.from, req.query.to),
      orders = repo.data.orders.filter(
        o =>
          o.shopId === req.shop.id &&
          (!req.query.from || o.createdAt.slice(0, 10) >= req.query.from) &&
          (!req.query.to || o.createdAt.slice(0, 10) <= req.query.to),
      );
    const days: Record<string, Row> = {},
      best: Record<string, Row> = {};
    f.transactions.forEach(t => {
      const key = t.createdAt.slice(0, 10);
      days[key] ??= { date: key, sales: 0, profit: 0 };
      days[key].sales += t.amount;
      days[key].profit += t.settlementAmount;
      const o = orders.find(o => o.id === t.orderId);
      o?.items.forEach((i: Row) => {
        best[i.productId] ??= { name: i.name, emoji: i.emoji, quantity: 0 };
        best[i.productId].quantity += i.quantity;
      });
    });
    res.json({
      ...f,
      totalOrders: orders.length,
      cancelledOrders: orders.filter(o =>
        ['Rejected', 'Cancelled'].includes(o.status),
      ).length,
      chart: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)),
      bestSellers: Object.values(best).sort((a, b) => b.quantity - a.quantity),
    });
  });
  app.get('/api/rewards', auth, (req: any, res) => {
    const ledger = repo.data.rewards.filter(r => r.shopId === req.shop.id);
    res.json({ points: ledger.reduce((a, r) => a + r.points, 0), ledger });
  });
  app.get('/api/notifications', auth, (req: any, res) =>
    res.json(repo.data.notifications.filter(n => n.shopId === req.shop.id)),
  );
  app.patch(
    '/api/notifications/:id/read',
    auth,
    wrap(async (req: any, res: any) => {
      await repo.mutate(d => {
        own(d, 'notifications', req.params.id, req.shop.id).read = true;
      });
      emit(req.shop.id, 'notification:new', {});
      res.json({ message: 'Notification read' });
    }),
  );
  app.post(
    '/api/notifications/read-all',
    auth,
    wrap(async (req: any, res: any) => {
      await repo.mutate(d =>
        d.notifications
          .filter(n => n.shopId === req.shop.id)
          .forEach(n => (n.read = true)),
      );
      emit(req.shop.id, 'notification:new', {});
      res.json({ message: 'All notifications marked read' });
    }),
  );
  app.get('/api/support/tickets', auth, (req: any, res) =>
    res.json(repo.data.tickets.filter(t => t.shopId === req.shop.id)),
  );
  app.post(
    '/api/support/tickets',
    auth,
    wrap(async (req: any, res: any) => {
      const b = z
        .object({
          subject: z.string().trim().min(3).max(150),
          issueType: z.string().min(2).max(50),
          description: z.string().trim().min(10).max(3000),
          orderId: z.string().optional(),
          attachment: z
            .string()
            .regex(/^\/uploads\/[a-f0-9-]+\.(png|jpg|webp)$/)
            .optional(),
        })
        .parse(req.body);
      const ticket = await repo.mutate(d => {
        if (b.orderId) own(d, 'orders', b.orderId, req.shop.id);
        const ticket = {
          id: 'CP' + id().slice(0, 8),
          shopId: req.shop.id,
          ...b,
          status: 'Open',
          createdAt: now(),
          messages: [
            {
              id: id(),
              author: 'Shopkeeper',
              body: b.description,
              createdAt: now(),
            },
          ],
        };
        d.tickets.unshift(ticket);
        notice(
          d,
          req.shop.id,
          'Support ticket opened',
          b.subject,
          '/support',
          'System',
        );
        return ticket;
      });
      emit(req.shop.id, 'notification:new', {});
      res.status(201).json(ticket);
    }),
  );
  app.get(
    '/api/support/tickets/:id/messages',
    auth,
    wrap((req: any, res: any) =>
      res.json(own(repo.data, 'tickets', req.params.id, req.shop.id).messages),
    ),
  );
  app.post(
    '/api/support/tickets/:id/messages',
    auth,
    wrap(async (req: any, res: any) => {
      const body = z.string().trim().min(1).max(3000).parse(req.body.body);
      await repo.mutate(d =>
        own(d, 'tickets', req.params.id, req.shop.id).messages.push({
          id: id(),
          author: 'Shopkeeper',
          body,
          createdAt: now(),
        }),
      );
      res.status(201).json({ message: 'Reply added' });
    }),
  );
  app.post(
    '/api/demo/orders',
    auth,
    wrap(async (req: any, res: any) => {
      if (!demo || req.user.id !== 'demo-owner')
        fail(403, 'Only available in the seeded demo shop');
      const o = await repo.mutate(d => {
        const shop = d.shops.find(s => s.id === req.shop.id)!;
        if (shop.status === 'closed')
          fail(409, 'Shop closed: new orders cannot be assigned');
        if (
          shop.status === 'busy' &&
          d.orders.filter(
            o =>
              o.shopId === shop.id &&
              !['Delivered', 'Rejected', 'Cancelled'].includes(o.status),
          ).length >= shop.capacity
        )
          fail(409, 'Busy shop capacity reached');
        const p = d.products.find(
          p =>
            p.shopId === shop.id &&
            p.isAvailable &&
            p.quantity - p.reserved > 0,
        );
        if (!p) fail(409, 'No products available');
        const o = {
          id: 'ZB' + Date.now().toString().slice(-8),
          shopId: shop.id,
          orderNumber: '',
          customer: { name: 'Demo Customer', phone: '+92 300 1112223' },
          address: 'Gulberg, Lahore',
          items: [
            {
              productId: p!.id,
              name: p!.name,
              quantity: 1,
              price: p!.pricePkr,
              emoji: p!.emoji,
            },
          ],
          subtotal: p!.pricePkr,
          deliveryFee: 100,
          total: p!.pricePkr + 100,
          paymentMethod: 'Cash',
          paymentStatus: 'Unpaid',
          status: 'New',
          instructions: 'Demo test order',
          createdAt: now(),
          updatedAt: now(),
          isDemo: true,
          rider: {
            name: 'Ali Raza',
            phone: '+923109876543',
            bikeModel: 'Honda CD 70',
            licensePlate: 'LHR-7845',
            rating: 4.8,
          },
          pickupOtpHash: bcrypt.hashSync('4587', 10),
          otpExpiresAt: new Date(Date.now() + 86400000).toISOString(),
          otpAttempts: 0,
          timestamps: { New: now() },
        };
        o.orderNumber = o.id;
        d.orders.unshift(o);
        notice(d, shop.id, 'New order received', '#' + o.id, '/orders/' + o.id);
        return cleanOrder(o);
      });
      emit(req.shop.id, 'order:new', o);
      emit(req.shop.id, 'notification:new', {});
      res.status(201).json(o);
    }),
  );
  app.post(
    '/api/demo/orders/:id/deliver',
    auth,
    wrap(async (req: any, res: any) => {
      if (!demo || req.user.id !== 'demo-owner') fail(403, 'Demo only');
      await repo.mutate(d => {
        const o = own(d, 'orders', req.params.id, req.shop.id);
        if (!o.isDemo || o.status !== 'Handed Over')
          fail(409, 'Hand over this demo order first');
        o.status = 'Delivered';
        o.paymentStatus = 'Paid';
        o.timestamps.Delivered = now();
        if (!d.transactions.some(t => t.orderId === o.id))
          d.transactions.push({
            id: id(),
            shopId: req.shop.id,
            orderId: o.id,
            amount: o.subtotal,
            commission: Math.round(o.subtotal * 0.1),
            settlementAmount: Math.round(o.subtotal * 0.9),
            paymentMethod: o.paymentMethod,
            paymentStatus: 'Paid',
            settled: false,
            isDemoTransaction: true,
            createdAt: now(),
          });
        notice(
          d,
          req.shop.id,
          'Demo payment recorded',
          '#' + o.id,
          '/earnings',
          'System',
        );
      });
      emit(req.shop.id, 'order:status', {});
      emit(req.shop.id, 'payment:updated', {});
      res.json({ message: 'Demo delivery and payment recorded' });
    }),
  );
  app.post(
    '/api/demo/multi-shop/quote',
    auth,
    wrap((req: any, res: any) => {
      if (!demo) fail(404, 'Demo disabled');
      const coordinate = z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      });
      const b = z
        .object({
          center: coordinate,
          shops: z
            .array(coordinate.extend({ id: z.string().min(1) }))
            .min(1)
            .max(25),
        })
        .parse(req.body);
      res.json({
        extraFeePkr: multiShopFee(b.shops.map(s => s.id)),
        pickupBatches: pickupBatches(b.shops, b.center, 5),
        serviceRadiusKm: 5,
        maxShopsPerBatch: 5,
      });
    }),
  );
  app.use('/api', (_req, res) =>
    res.status(404).json({ message: 'API route not found' }),
  );
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        message: err.errors
          .map(e => e.path.join('.') + ': ' + e.message)
          .join('; '),
      });
    res
      .status(err.status || (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500))
      .json({
        message:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be under 5 MB'
            : err.status
            ? err.message
            : 'Server error. Please retry.',
      });
    if (!err.status && !(err instanceof z.ZodError)) console.error(err.message);
  });
  io.use((socket, next) => {
    const cookies = socket.handshake.headers.cookie || '',
      token = cookies
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('zest_session='))
        ?.slice(13);
    const user = tokenUser(token);
    if (!user) return next(new Error('Unauthorized'));
    socket.data.user = user;
      socket.data.sid=(jwt.verify(token!,secret) as any).sid;
    next();
  });
  io.on('connection', socket => {
    const shop = repo.data.shops.find(s => s.ownerId === socket.data.user.id);
    if (shop) socket.join(shop.id);
    socket.join('session:'+socket.data.sid);
  });
  return { app, http, io, repo };
}
