import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import axios from 'axios';

function load(handler) {
  const requests = [];
  const user = { userId: 7, role: 'ADMIN', email: 'admin@example.com', fullName: 'Admin' };
  const context = {
    Headers, DOMException, AbortController,
    window: { addEventListener() {} },
    localStorage: { getItem: () => 'legacy-token', removeItem() {}, setItem() {} },
    fetch: async (url, options) => {
      requests.push({ url, options });
      const response = await handler?.(url, options);
      return response ?? { ok: true, status: 200, json: async () => user };
    },
  };
  function compile(path, require = () => { throw new Error('Unexpected import'); }) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8').replace('import.meta.env.VITE_API_URL', '""');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, { ...context, module, exports: module.exports, require });
    return module.exports;
  }
  const session = compile('../src/lib/session.ts');
  const exports = compile('../src/lib/api.ts', name => {
    if (name === 'axios') return axios;
    if (name === './session') return session;
    if (name === '../i18n/core') return { getBrowserLocale: () => 'vi', getErrorMessage: () => '' };
    throw new Error(`Unexpected import: ${name}`);
  });
  return { ...exports, requests, session };
}

test('concurrent admin 401s refresh once and replay with cookies, never bearer tokens', async () => {
  let refreshed = false;
  let replays = 0;
  const app = load(async url => {
    if (url === '/api/auth/session') return { ok: false, status: 401, json: async () => ({ code: 'UNAUTHENTICATED' }) };
    await new Promise(resolve => setTimeout(resolve, 10));
    refreshed = true;
  });
  app.api.defaults.adapter = async config => {
    assert.equal(config.headers.get('Authorization'), undefined);
    assert.equal(config.headers.get('X-Clucky-Client'), 'admin');
    assert.equal(config.withCredentials, true);
    if (!refreshed) throw new axios.AxiosError('expired', 'ERR_BAD_REQUEST', config, null, { status: 401, config });
    replays++;
    return { status: 200, data: {}, headers: {}, config };
  };
  await Promise.all([app.api.get('/api/orders'), app.api.get('/api/users/me')]);
  assert.equal(app.requests.filter(request => request.url === '/api/auth/refresh').length, 1);
  assert.equal(app.requests.length, 2);
  assert.equal(replays, 2);
});

test('auth and business requests discard stale bearer tokens and use the admin cookie scope', async () => {
  const app = load();
  assert.equal(app.api.defaults.baseURL, '');
  await app.authApi.refresh();
  await app.authApi.logout();
  await app.authApi.login({ email: 'admin@example.com', password: 'Password1' });
  for (const { options } of app.requests) {
    assert.equal(options.headers.get('Authorization'), null);
    assert.equal(options.headers.get('X-Clucky-Client'), 'admin');
    assert.equal(options.credentials, 'include');
  }
  app.api.defaults.adapter = async config => {
    assert.equal(config.headers.get('Authorization'), undefined);
    assert.equal(config.headers.get('X-Clucky-Client'), 'admin');
    assert.equal(config.withCredentials, true);
    return { status: 200, data: {}, headers: {}, config };
  };
  await app.api.get('/api/orders', { headers: { Authorization: 'Bearer stale' } });
});

test('403 session bootstrap leaves the admin signed out without an error screen', async () => {
  const app = load(() => ({ ok: false, status: 403, json: async () => ({ code: 'FORBIDDEN' }) }));
  assert.equal(await app.authApi.session(), null);
  assert.equal(app.session.getSessionState().ready, true);
  assert.equal(app.session.getSessionState().error, null);
  assert.equal(app.requests.filter(request => request.url === '/api/auth/refresh').length, 1);
});

test('expired 403s clear the admin session after a single refresh attempt', async () => {
  let expired = false;
  const app = load(() => expired ? { ok: false, status: 403, json: async () => ({ code: 'FORBIDDEN' }) } : undefined);
  await app.authApi.login({ email: 'admin@example.com', password: 'Password1' });
  expired = true;
  app.api.defaults.adapter = async config => {
    throw new axios.AxiosError('forbidden', 'ERR_BAD_REQUEST', config, null, { status: 403, config });
  };
  const results = await Promise.allSettled([app.api.get('/api/orders'), app.api.get('/api/users/me')]);
  assert.ok(results.every(result => result.status === 'rejected'));
  assert.equal(app.session.getSessionState().user, null);
  assert.equal(app.session.getSessionState().error, null);
  assert.equal(app.requests.filter(request => request.url === '/api/auth/refresh').length, 1);
});

test('a business 403 preserves a valid admin session and does not loop', async () => {
  const app = load();
  let attempts = 0;
  await app.authApi.login({ email: 'admin@example.com', password: 'Password1' });
  app.api.defaults.adapter = async config => {
    attempts++;
    throw new axios.AxiosError('forbidden', 'ERR_BAD_REQUEST', config, null, { status: 403, config });
  };
  await assert.rejects(app.api.get('/api/orders'), error => error.response.status === 403);
  assert.equal(app.session.getSessionState().user.userId, 7);
  assert.equal(attempts, 2);
  assert.equal(app.requests.filter(request => request.url === '/api/auth/refresh').length, 0);
});
