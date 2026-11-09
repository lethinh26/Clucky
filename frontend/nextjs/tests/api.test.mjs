import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const customer = { userId: 7, role: 'CUSTOMER', email: 'customer@example.com', fullName: 'Customer' };
const result = (status, data = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test('paged catalog responses are unwrapped without appending unpaged combos', async () => {
  const products = [{ id: 1, name: 'Chicken' }];
  const app = load('customer', () => result(200, { content: products }));
  assert.deepEqual(await app.api.catalogApi.getProducts({ page: 0, size: 5 }), products);
  assert.deepEqual(app.requests.map(request => request.path), ['/api/catalog/products']);
});

function locks() {
  let queue = Promise.resolve();
  return { request: (_name, action) => {
    const next = queue.then(action);
    queue = next.catch(() => {});
    return next;
  } };
}

function load(client, handler, sharedLocks = locks()) {
  const requests = [];
  const storage = new Map([[client === 'admin' ? 'clucky_admin_access_token' : 'clucky_access_token', 'legacy-token']]);
  const events = new Map();
  const context = {
    Headers, DOMException, URLSearchParams, AbortController,
    window: { addEventListener: (name, listener) => events.set(name, listener) },
    navigator: { locks: sharedLocks },
    crypto: { randomUUID: () => 'guest-session-id' },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    process: { env: { NEXT_PUBLIC_API_URL: 'http://localhost:8080' } },
    fetch: async (url, options) => {
      const path = new URL(url).pathname;
      requests.push({ path, options });
      return handler(path, options);
    },
  };
  function compile(source, require = () => { throw new Error('Unexpected import'); }) {
    const module = { exports: {} };
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, { ...context, module, exports: module.exports, require });
    return module.exports;
  }
  const path = client === 'admin' ? '../../react/src/lib/session.ts' : '../lib/session.ts';
  const session = compile(readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace('import.meta.env.VITE_API_URL', '"http://localhost:8080"'));
  const api = client === 'customer' ? compile(readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8'), name => {
    if (name === './session') return session;
    if (name === './i18n/core') return { getBrowserLocale: () => 'vi', getErrorMessage: () => '' };
    throw new Error(`Unexpected import: ${name}`);
  }) : null;
  return { session, api, requests, storage, events };
}

for (const client of ['customer', 'admin']) {
  if (client === 'customer') test('public store reads survive initial session discovery', async () => {
    let complete;
    const app = load(client, path => path === '/api/auth/login' ? result(200, customer)
      : new Promise(resolve => { complete = () => resolve(result(200, [{ id: 1 }])); }));
    const stores = app.api.catalogApi.getStores();
    await app.api.authApi.login({ email: customer.email, password: 'Password123' });
    complete();
    assert.deepEqual(await stores, [{ id: 1 }]);
  });
  const user = { ...customer, role: client === 'admin' ? 'ADMIN' : 'CUSTOMER' };
  test(`${client}: concurrent 401s refresh once and retry once without exposing tokens`, async () => {
    let valid = false;
    const app = load(client, path => {
      if (path === '/api/auth/refresh') { valid = true; return result(200, user); }
      return valid ? result(200, path === '/api/auth/session' ? user : { items: [] }) : result(401);
    });
    await Promise.all([app.session.sessionRequest('/api/cart'), app.session.sessionRequest('/api/orders/my')]);
    assert.equal(app.requests.filter(request => request.path === '/api/auth/refresh').length, 1);
    assert.equal(app.requests.filter(request => request.path === '/api/cart').length, 2);
    for (const { options } of app.requests) {
      assert.equal(options.credentials, 'include');
      assert.equal(options.headers.get('X-Clucky-Client'), client);
      assert.equal(options.headers.get('Authorization'), null);
    }
    assert.equal(app.storage.has(client === 'admin' ? 'clucky_admin_access_token' : 'clucky_access_token'), false);
  });

  test(`${client}: two tabs serialize refresh rotation`, async () => {
    let valid = false;
    let refreshes = 0;
    const handler = path => {
      if (path === '/api/auth/refresh') { valid = true; refreshes++; return result(200, user); }
      return valid ? result(200, user) : result(401);
    };
    const sharedLocks = locks();
    const first = load(client, handler, sharedLocks);
    const second = load(client, handler, sharedLocks);
    await Promise.all([first.session.sessionRequest('/api/orders/my'), second.session.sessionRequest('/api/orders/my')]);
    assert.equal(refreshes, 1);
  });

  test(`${client}: expired refresh ends session, does not loop`, async () => {
    const app = load(client, () => result(401));
    await assert.rejects(app.session.sessionRequest('/api/cart'), error => error.status === 401);
    assert.equal(app.requests.filter(request => request.path === '/api/auth/refresh').length, 1);
    assert.equal(app.requests.filter(request => request.path === '/api/cart').length, 1);
    assert.equal(app.session.getSessionState().user, null);
    assert.equal(app.session.getSessionState().ready, true);
  });

  test(`${client}: failed credentials and forbidden requests never refresh`, async () => {
    const app = load(client, path => result(path.startsWith('/api/auth/') ? 401 : 403));
    await assert.rejects(app.session.signIn('/api/auth/login', {}), error => error.status === 401);
    await assert.rejects(app.session.sessionRequest('/api/orders/my'), error => error.status === 403);
    assert.equal(app.requests.some(request => request.path === '/api/auth/refresh'), false);
  });

  test(`${client}: refresh outage preserves user and does not replay mutation`, async () => {
    const app = load(client, path => {
      if (path === '/api/auth/login') return result(200, user);
      return result(path === '/api/auth/refresh' ? 503 : 401);
    });
    await app.session.signIn('/api/auth/login', {});
    await assert.rejects(app.session.sessionRequest('/api/cart/items', { method: 'POST' }), error => error.status === 503);
    assert.equal(app.session.getSessionState().user.userId, user.userId);
    assert.equal(app.requests.filter(request => request.path === '/api/cart/items').length, 1);
  });

  test(`${client}: logout discards old in-flight responses`, async () => {
    let release;
    const app = load(client, path => {
      if (path === '/api/auth/login') return result(200, user);
      if (path === '/api/auth/logout') return result(200);
      return new Promise(resolve => { release = resolve; });
    });
    await app.session.signIn('/api/auth/login', {});
    const pending = app.session.sessionRequest('/api/orders/my');
    await app.session.endSession();
    release(result(200, { privateOrders: true }));
    await assert.rejects(pending, error => error.name === 'AbortError');
    assert.equal(app.session.getSessionState().user, null);
  });
}

test('guest cart keeps stable headers; login and merge use cookies', async () => {
  const app = load('customer', path => result(200, path === '/api/auth/login' ? customer : { items: [] }));
  await app.api.cartApi.getCart();
  await app.api.cartApi.addItem({ productId: 1, itemName: 'Chicken', quantity: 1 });
  for (const { options } of app.requests) {
    assert.equal(options.headers.get('X-Guest-Session-Id'), 'guest-session-id');
    assert.equal(options.headers.get('Authorization'), null);
  }
  await app.api.authApi.login({ email: customer.email, password: 'Password123' });
  await app.api.cartApi.mergeCart('guest-session-id');
  assert.equal(app.requests.at(-1).options.credentials, 'include');
  assert.equal(app.requests.at(-1).options.headers.get('Authorization'), null);
});
