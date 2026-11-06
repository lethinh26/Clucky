import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('concurrent customer 401s share a refresh and replay with the new token', async () => {
  const source = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  let token = 'expired';
  let refreshes = 0;
  let replays = 0;
  vm.runInNewContext(outputText, {
    module, exports: module.exports, Headers,
    window: {}, process: { env: { NEXT_PUBLIC_API_URL: '' } },
    localStorage: {
      getItem: (key) => key === 'clucky_access_token' ? token : null,
      setItem: (_key, value) => { token = value; },
    },
    require: (name) => name === './i18n/core' ? { getBrowserLocale: () => 'vi' } : {},
    fetch: async (url, options) => {
      if (url === '/api/auth/refresh') {
        refreshes++;
        assert.equal(options.credentials, 'include');
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ok: true, json: async () => ({ accessToken: 'fresh' }) };
      }
      const fresh = options.headers.get('Authorization') === 'Bearer fresh';
      if (fresh) replays++;
      return { ok: fresh, status: fresh ? 200 : 401, json: async () => ({}) };
    },
  });
  await Promise.all([module.exports.request('/api/users/me'), module.exports.request('/api/users/me/addresses')]);
  assert.equal(refreshes, 1);
  assert.equal(replays, 2);
});

for (const mode of ['server', 'browser', 'same-origin']) {
  const server = mode === 'server';
  const publicUrl = mode === 'same-origin' ? '' : 'https://gateway-public';
  test(`${mode} API preserves catalog routing and auth cookies`, async () => {
    const source = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
    const catalogSource = readFileSync(new URL('../lib/catalog-and-stores.api.ts', import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const { outputText: catalogOutput } = ts.transpileModule(catalogSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const module = { exports: {} };
    const catalogModule = { exports: {} };
    const requests = [];
    const context = {
      module,
      exports: module.exports,
      Headers,
      URLSearchParams,
      ...(server ? {} : { window: {}, localStorage: {
        getItem: (key) => key === 'clucky_access_token' ? 'expired-access-token' : null,
      } }),
      process: { env: { API_URL: 'http://gateway-internal', NEXT_PUBLIC_API_URL: publicUrl } },
      fetch: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, json: async () => [] };
      },
      require: (name) => {
        if (name === './i18n/core') return { getBrowserLocale: () => 'vi', getErrorMessage: () => '' };
        if (name === './api') return module.exports;
        if (name === './catalog-and-stores.api') {
          if (!catalogModule.exports.catalogApi) {
            vm.runInNewContext(catalogOutput, {
              ...context,
              module: catalogModule,
              exports: catalogModule.exports,
            });
          }
          return catalogModule.exports;
        }
        throw new Error(`Unexpected import: ${name}`);
      },
    };
    vm.runInNewContext(outputText, context);

    const catalogContext = {
      ...context,
      module: catalogModule,
      exports: catalogModule.exports,
    };
    vm.runInNewContext(catalogOutput, catalogContext);

    await module.exports.authApi.refresh();
    await catalogModule.exports.catalogApi.getProducts({ storeId: 2, activeOnly: true });
    const base = server ? 'http://gateway-internal' : publicUrl;
    assert.equal(requests[0].url, `${base}/api/auth/refresh`);
    assert.equal(requests[1].url, `${base}/api/catalog/products?storeId=2&activeOnly=true`);
    assert.equal(requests[2].url, `${base}/api/catalog/combos?storeId=2&activeOnly=true`);
    for (const request of requests) {
      assert.equal(request.options.credentials, 'include');
      assert.equal(request.options.headers.get('Accept-Language'), 'vi');
    }
    assert.equal(requests[0].options.headers.get('Authorization'), null);
    await module.exports.authApi.google('firebase-token');
    await module.exports.authApi.completeGoogle('p'.repeat(43), 'Password123');
    await module.exports.authApi.login({ email: 'customer@example.com', password: 'Password123' });
    for (const request of requests.slice(3)) {
      assert.equal(request.options.headers.get('Authorization'), null);
      assert.equal(request.options.credentials, 'include');
    }
    if (!server) assert.equal(requests[1].options.headers.get('Authorization'), 'Bearer expired-access-token');
  });
}
