import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { ActivityIndicator, Text, TextInput } from 'react-native';
import App from '../App';
import { request } from '../src/services/client';
import * as client from '../src/services/client';

const settle = () => new Promise(resolve => setImmediate(resolve));
async function flush() {
  await act(async () => {
    await settle();
  });
}
function label(node) {
  return node
    .findAllByType(Text)
    .map(t => t.props.children)
    .filter(v => typeof v === 'string')
    .join(' ');
}
let tree;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  jest.restoreAllMocks();
  await request('/auth/logout', 'POST');
});

test('loading and zero-catalogue inventory keep navigation and add-product flow usable', async () => {
  await request('/auth/demo', 'POST', {});
  const originalRequest = client.request;
  let resolveProducts;
  jest.spyOn(client, 'request').mockImplementation((path, ...args) => {
    if (path === '/products')
      return new Promise(resolve => {
        resolveProducts = resolve;
      });
    return originalRequest(path, ...args);
  });
  await act(async () => {
    tree = Renderer.create(<App />);
    await settle();
  });
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 1850));
  });
  await flush();
  await tapLabel('Inventory');
  expect(tree.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  await act(async () => resolveProducts([]));
  await flush();
  expect(has('Add your first product to get started.')).toBe(true);
  await tap('Add Product');
  expect(has('Save Product')).toBe(true);
  await tapLabel('Home');
  expect(has('Recent Orders')).toBe(true);
});
async function tap(text) {
  const button = tree.root
    .findAll(n => typeof n.props.onPress === 'function')
    .filter(n => label(n).includes(text))
    .at(-1);
  if (!button)
    throw new Error(
      'Missing ' +
        text +
        '; buttons: ' +
        tree.root
          .findAll(n => typeof n.props.onPress === 'function')
          .map(label)
          .join(' | '),
    );
  await act(async () => {
    await button.props.onPress();
    await settle();
  });
  await flush();
}
function has(text) {
  return tree.root
    .findAllByType(Text)
    .some(n => String(n.props.children).includes(text));
}
async function fill(name, value) {
  const field = tree.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === name);
  expect(field).toBeTruthy();
  await act(async () => field.props.onChangeText(value));
}
async function tapLabel(name) {
  const node = tree.root
    .findAll(
      n =>
        n.props.accessibilityLabel === name &&
        typeof n.props.onPress === 'function',
    )
    .at(-1);
  expect(node).toBeTruthy();
  await act(async () => {
    await node.props.onPress();
    await settle();
  });
  await flush();
}
test('native navigation, demo login, inventory search, settings and protected logout', async () => {
  await act(async () => {
    tree = Renderer.create(<App />);
    await settle();
  });
  expect(
    tree.root.findAll(n => n.props.testID === 'brand-splash').length,
  ).toBeGreaterThan(0);
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 1850));
  });
  await flush();
  expect(has('Your shop. One simple place.')).toBe(true);
  await tap('Register Your Shop');
  await tap('Register Your Shop');
  expect(has('This field is required.')).toBe(true);
  await tap('Already have an account? Login');
  await tap('Demo Login');
  expect(has('Recent Orders')).toBe(true);
  const originalRequest = client.request;
  let failedProducts = false;
  const requestSpy = jest
    .spyOn(client, 'request')
    .mockImplementation((path, ...args) => {
      if (path === '/products' && !failedProducts) {
        failedProducts = true;
        return Promise.reject(new Error('Connection interrupted'));
      }
      return originalRequest(path, ...args);
    });
  await tap('Inventory');
  expect(has('Network Error')).toBe(true);
  await tap('Retry');
  requestSpy.mockRestore();
  expect(has('Organic Wheat Flour (5kg)')).toBe(true);
  expect(has('Restock Planner')).toBe(true);
  await tap('Needs Restock');
  expect(has('Organic Wheat Flour (5kg)')).toBe(false);
  await tap('All Stock');
  await tap('Add');
  expect(has('Save Product')).toBe(true);
  await fill('Product Name *', 'Test Product');
  await fill('Price (PKR) *', '250');
  await fill('Stock Quantity *', '10');
  await tap('Save Product');
  expect(has('Test Product')).toBe(true);
  await tapLabel('Edit Test Product');
  await fill('Stock Quantity *', '8');
  await tap('Save Product');
  expect(
    (await request('/products')).find(p => p.name === 'Test Product').quantity,
  ).toBe(8);
  await tapLabel('Delete Test Product');
  await tap('Cancel');
  expect(
    (await request('/products')).some(p => p.name === 'Test Product'),
  ).toBe(true);
  await tapLabel('Delete Test Product');
  await tap('Delete');
  expect(
    (await request('/products')).some(p => p.name === 'Test Product'),
  ).toBe(false);
  await tap('Inventory');
  await tap('Inventory History');
  expect(has('Physical stock shown.')).toBe(true);
  await tap('Orders');
  await tap('Ready');
  expect(has('No Orders Yet')).toBe(true);
  await tap('New');
  await tap('Details');
  await tap('View Receipt');
  expect(has('Share / Save Receipt')).toBe(true);
  await tap('Orders');
  await tap('Details');
  await tap('Accept');
  await tap('Start Preparing');
  expect(has('10 Minute Target')).toBe(true);
  await tapLabel('Home');
  expect(has('Preparation Priority')).toBe(true);
  await tap('ZB10044 · 0 min');
  expect(has('10 Minute Target')).toBe(true);
  await tap('View Points History');
  expect(has('Golden Points')).toBe(true);
  await tap('Orders');
  await tap('Accepted');
  // The accepted order is preparing now; open it through its preparing tab.
  await tap('Preparing');
  await tap('Details');
  await tap('Track Preparation');
  await tap('Continue to Packing');
  expect(has('Order Pack Ho Gaya?')).toBe(true);
  const checks = [
    ...new Set(
      tree.root
        .findAll(
          n =>
            n.props.accessibilityRole === 'checkbox' &&
            typeof n.props.onPress === 'function',
        )
        .map(n => n.props.onPress),
    ),
  ];
  for (const check of checks) await act(async () => check());
  await tap('Haan, Confirm Karo');
  expect(has('Rider Assigned')).toBe(true);
  const otp = tree.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === "Enter rider's pickup code");
  await act(async () => otp.props.onChangeText('4587'));
  await tap('Verify OTP & Hand Over');
  await tap('Demo: Mark Delivered');
  expect(
    (await request('/orders')).some(
      o => o.customer.name === 'Sara Ali' && o.status === 'Delivered',
    ),
  ).toBe(true);
  await tap('Inventory');
  const search = tree.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === 'Search products');
  await act(async () => search.props.onChangeText('no such product'));
  expect(has('No Products Found')).toBe(true);
  await tap('Clear Filters');
  expect(has('Organic Wheat Flour (5kg)')).toBe(true);
  await tap('Settings');
  await tapLabel('Use Dark theme');
  expect(
    tree.root.findAll(
      n => n.props.accessibilityLabel === 'Switch to light mode',
    ).length,
  ).toBeGreaterThan(0);
  await tapLabel('Home');
  expect(has('Recent Orders')).toBe(true);
  await tapLabel('Inventory');
  expect(has('Organic Wheat Flour (5kg)')).toBe(true);
  await tapLabel('Settings');
  await tapLabel('Use Light theme');
  expect(
    tree.root.findAll(n => n.props.accessibilityLabel === 'Switch to dark mode')
      .length,
  ).toBeGreaterThan(0);
  await tap('Shop Profile');
  expect(has('Shop Details')).toBe(true);
  await tap('Operating Hours');
  expect(has('Save Operating Hours')).toBe(true);
  await tap('Settings');
  await tap('Shop Profile');
  await tap('Verification Documents');
  expect(has('Choose Verification Document')).toBe(true);
  await tap('Settings');
  await tap('Manage Shop Status');
  await tap('Closed');
  await tap('Save Changes');
  await tap('Close Shop');
  expect(has('Your shop is currently closed.')).toBe(true);
  await tap('Free');
  await tap('Save Changes');
  await tap('Settings');
  await tap('Earnings');
  expect(has('Pending Settlement')).toBe(true);
  await tap('Settings');
  await tap('Sales Reports');
  expect(has('Sales Overview')).toBe(true);
  await tap('Settings');
  await tap('Customer Support');
  await tap('Contact Support');
  expect(has('Submit Ticket')).toBe(true);
  await tap('My Tickets');
  await tap('Missing Item');
  expect(has('Send Reply')).toBe(true);
  await tap('Settings');
  await tap('Notifications');
  await tap('Mark all read');
  await tap('Offers');
  expect(has('All caught up')).toBe(true);
  await tap('Settings');
  await tap('Security & Account');
  expect(has('Account Security')).toBe(true);
  await tap('Change Password');
  expect(has('Update Password')).toBe(true);
  await tap('Settings');
  await tap('Security & Account');
  await tap('Active Sessions');
  expect(has('Current device')).toBe(true);
  await tap('Settings');
  await tap('Logout');
  await tap('Logout');
  expect(has('Shopkeeper Login')).toBe(true);
  expect(has('Account Security')).toBe(false);
  await act(async () => tree.unmount());
});
