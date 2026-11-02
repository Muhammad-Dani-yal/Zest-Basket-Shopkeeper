import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { models } from './models.js';
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export type Row = Record<string, any>;
export type Store = {
  uploads: Row[];
  segments: Row[];
  riders: Row[];
  users: Row[];
  shops: Row[];
  products: Row[];
  orders: Row[];
  logs: Row[];
  notifications: Row[];
  tickets: Row[];
  transactions: Row[];
  rewards: Row[];
  sessions: Row[];
  verification: Row[];
};
export const empty = (): Store => ({
  uploads: [],
  segments: [],
  riders: [],
  users: [],
  shops: [],
  products: [],
  orders: [],
  logs: [],
  notifications: [],
  tickets: [],
  transactions: [],
  rewards: [],
  sessions: [],
  verification: [],
});
export function seed(): Store {
  const d = empty(),
    shopId = 'freshmart',
    date = now();
  d.users.push({
    id: 'demo-owner',
    fullName: 'Ahmed Khan',
    phone: '03001234567',
    cnic: '35202-1234567-1',
    passwordHash: bcrypt.hashSync('ZestDemo123', 10),
    role: 'shopkeeper',
    createdAt: date,
  });
  d.shops.push({
    id: shopId,
    ownerId: 'demo-owner',
    shopName: 'FreshMart',
    address: 'House 12, Street 4, Defence Phase 2, Lahore',
    status: 'active',
    verificationStatus: 'Verified',
    deliveryRadiusKm: 5,
    capacity: 5,
    holidays: [],
    workingHours: Object.fromEntries(
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => [
        x,
        { open: '08:00', close: '23:00' },
      ]),
    ),
    shopAvatar: '',
  });
  [
    ['flour', 'Organic Wheat Flour (5kg)', 'Grocery', 650, 45, 'pack', '🌾'],
    ['milk', 'Fresh Dairy Milk (1L)', 'Dairy', 100, 30, 'L', '🥛'],
    ['bananas', 'Bananas', 'Fruits', 120, 15, 'dozen', '🍌'],
    ['tomatoes', 'Tomatoes', 'Vegetables', 100, 5, 'kg', '🍅'],
  ].forEach(([pid, name, category, price, quantity, unit, emoji]) => {
    d.products.push({
      id: pid,
      shopId,
      name,
      category,
      pricePkr: price,
      quantity,
      reserved: 0,
      unit,
      emoji,
      description: 'Fresh quality groceries, carefully selected for your home.',
      imageUrl: '',
      isAvailable: true,
      lowStockThreshold: 5,
    });
    d.logs.push({
      id: id(),
      shopId,
      productId: pid,
      productName: name,
      actionType: 'Added',
      previousQuantity: 0,
      newQuantity: quantity,
      quantityChange: quantity,
      timestamp: date,
    });
  });
  const makeOrder = (
    num: string,
    customer: string,
    items: Row[],
    status = 'New',
    offset = 0,
  ) => {
    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0),
      createdAt = new Date(Date.now() - offset * 86400000).toISOString();
    return {
      id: num,
      shopId,
      orderNumber: num,
      customer: { name: customer, phone: '+92 300 1234567' },
      address: 'House 12, Street 4, Defence Phase 2, Lahore',
      items,
      subtotal,
      deliveryFee: 100,
      total: subtotal + 100,
      paymentMethod: 'Cash',
      paymentStatus: status === 'Delivered' ? 'Paid' : 'Unpaid',
      status,
      instructions: 'Please give fresh items only.',
      createdAt,
      updatedAt: createdAt,
      isDemo: true,
      rider: {
        name: 'Ali Raza',
        phone: '+923109876543',
        bikeModel: 'Honda CD 70',
        licensePlate: 'LHR-7845',
        rating: 4.8,
      },
      pickupOtpHash: bcrypt.hashSync('4587', 10),
      otpAttempts: 0,
      otpExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      timestamps: { [status]: createdAt },
    };
  };
  d.orders.push(
    makeOrder('ZB10045', 'Ahmed Khan', [
      {
        productId: 'flour',
        name: 'Organic Wheat Flour (5kg)',
        quantity: 2,
        price: 650,
        emoji: '🌾',
      },
      {
        productId: 'milk',
        name: 'Fresh Dairy Milk (1L)',
        quantity: 1,
        price: 100,
        emoji: '🥛',
      },
    ]),
    makeOrder('ZB10044', 'Sara Ali', [
      {
        productId: 'tomatoes',
        name: 'Tomatoes',
        quantity: 2,
        price: 100,
        emoji: '🍅',
      },
      {
        productId: 'bananas',
        name: 'Bananas',
        quantity: 1,
        price: 120,
        emoji: '🍌',
      },
    ]),
  );
  for (let i = 0; i < 7; i++) {
    const o = makeOrder(
      'ZB0990' + i,
      ['Ayesha Ali', 'Hassan Ahmed', 'Usman Khan'][i % 3],
      [
        {
          productId: i % 2 ? 'flour' : 'milk',
          name: i % 2 ? 'Organic Wheat Flour (5kg)' : 'Fresh Dairy Milk (1L)',
          quantity: 2 + i,
          price: i % 2 ? 650 : 100,
          emoji: i % 2 ? '🌾' : '🥛',
        },
      ],
      'Delivered',
      i,
    );
    d.orders.push(o);
    d.transactions.push({
      id: id(),
      shopId,
      orderId: o.id,
      amount: o.subtotal,
      commission: Math.round(o.subtotal * 0.1),
      settlementAmount: Math.round(o.subtotal * 0.9),
      paymentMethod: i % 2 ? 'Cash' : 'Online',
      paymentStatus: 'Paid',
      settled: i > 1,
      isDemoTransaction: true,
      createdAt: o.createdAt,
    });
  }
  ['Missing Item', 'Wrong Product', 'Operating hours issue'].forEach(
    (subject, i) =>
      d.tickets.push({
        id: 'CP100' + (5 - i),
        shopId,
        subject,
        issueType: 'General',
        description: subject,
        status: i === 1 ? 'Resolved' : 'In Progress',
        createdAt: date,
        messages: [
          { id: id(), author: 'Shopkeeper', body: subject, createdAt: date },
        ],
      }),
  );
  d.rewards.push({
    id: id(),
    shopId,
    points: 48,
    reason: 'Demo welcome reward',
    createdAt: date,
  });
  d.notifications.push(
    {
      id: id(),
      shopId,
      title: 'New order received',
      detail: '#ZB10045 · Ahmed Khan',
      category: 'Orders',
      href: '/orders/ZB10045',
      read: false,
      createdAt: date,
    },
    {
      id: id(),
      shopId,
      title: 'Welcome to ZestBasket',
      detail: 'Your shop is ready to grow.',
      category: 'System',
      href: '/shop/profile',
      read: false,
      createdAt: date,
    },
  );
  d.riders.push({
    id: 'ali-raza',
    name: 'Ali Raza',
    phone: '+923109876543',
    bikeModel: 'Honda CD 70',
    licensePlate: 'LHR-7845',
    availability: 'Available',
  });
  d.segments = d.orders.map(o => ({
    id: o.id + '-' + o.shopId,
    orderId: o.id,
    shopId: o.shopId,
    items: o.items,
    shopSubtotal: o.subtotal,
    status: o.status,
    riderId: 'ali-raza',
  }));
  return d;
}
export class Repository {
  data: Store = empty();
  private models: Record<string, any> | undefined;
  private file: string;
  private queue = Promise.resolve();
  constructor(file = process.env.DATA_FILE || path.resolve('data/store.json')) {
    this.file = file;
  }
  async init() {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      this.models = models();
      for (const [key, model] of Object.entries(this.models)) {
        await model.createCollection();
        const rows = await model.find({ portal: 'zestbasket' }).lean();
        (this.data as any)[key] = rows.map(
          ({ _id, portal, ...row }: any) => row,
        );
      }
      if (!this.data.users.length) this.data = seed();
    } else {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      this.data = fs.existsSync(this.file)
        ? { ...empty(), ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }
        : seed();
    }
    await this.save();
  }
  async mutate<T>(fn: (data: Store) => T | Promise<T>): Promise<T> {
    let result: T;
    const task = this.queue.then(async () => {
      const backup = structuredClone(this.data);
      try {
        result = await fn(this.data);
        this.data.segments = this.data.orders.map(o => ({
          id: o.id + '-' + o.shopId,
          orderId: o.parentOrderId || o.id,
          shopId: o.shopId,
          items: o.items,
          shopSubtotal: o.subtotal,
          status: o.status,
          riderId: o.rider ? 'ali-raza' : undefined,
          packingTimestamp: o.packingTimestamp,
          handoverTimestamp: o.handoverTimestamp,
          customerResolution: o.customerResolution,
        }));
        await this.save();
      } catch (e) {
        this.data = backup;
        throw e;
      }
    });
    this.queue = task.catch(() => {});
    await task;
    return result!;
  }
  async save() {
    if (this.models) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const [key, model] of Object.entries(this.models!)) {
            const rows = (this.data as any)[key] as Row[];
            if (rows.length)
              await model.bulkWrite(
                rows.map(row => ({
                  replaceOne: {
                    filter: { _id: row.id, portal: 'zestbasket' },
                    replacement: { ...row, _id: row.id, portal: 'zestbasket' },
                    upsert: true,
                  },
                })),
                { session },
              );
            await model.deleteMany(
              { portal: 'zestbasket', _id: { $nin: rows.map(r => r.id) } },
              { session },
            );
          }
        });
      } finally {
        await session.endSession();
      }
    } else {
      fs.writeFileSync(this.file + '.tmp', JSON.stringify(this.data, null, 2));
      fs.renameSync(this.file + '.tmp', this.file);
    }
  }
}
