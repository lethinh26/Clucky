import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for (const server of [true, false]) {
  test(`${server ? 'server' : 'browser'} API preserves catalog routing and auth cookies`, async () => {
    const source = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const module = { exports: {} };
    const requests = [];
    vm.runInNewContext(outputText, {
      module,
      exports: module.exports,
      Headers,
      URLSearchParams,
      ...(server ? {} : { window: {} }),
      process: { env: { API_URL: 'http://gateway-internal', NEXT_PUBLIC_API_URL: 'https://gateway-public' } },
      fetch: async (url, options) => {
        requests.push({ url, options });
        return { ok: true, json: async () => [] };
      },
      require: (name) => {
        if (name === './i18n/core') return { getBrowserLocale: () => 'vi', getErrorMessage: () => '' };
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    await module.exports.authApi.refresh();
    await module.exports.catalogApi.getProducts({ storeId: 2, activeOnly: true });
    const base = server ? 'http://gateway-internal' : 'https://gateway-public';
    assert.equal(requests[0].url, `${base}/api/auth/refresh`);
    assert.equal(requests[1].url, `${base}/api/catalog/products?storeId=2&activeOnly=true`);
    assert.equal(requests[2].url, `${base}/api/catalog/combos?storeId=2&activeOnly=true`);
    for (const request of requests) {
      assert.equal(request.options.credentials, 'include');
      assert.equal(request.options.headers.get('Accept-Language'), 'vi');
    }
  });
}
