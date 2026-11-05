import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for (const server of [true, false]) {
  test(`${server ? 'server' : 'browser'} API preserves catalog routing and auth cookies`, async () => {
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
      ...(server ? {} : { window: {} }),
      process: { env: { API_URL: 'http://gateway-internal', NEXT_PUBLIC_API_URL: 'https://gateway-public' } },
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
