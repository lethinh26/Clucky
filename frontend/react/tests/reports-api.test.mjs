import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import axios from 'axios';

function loadApiModule() {
  const user = { userId: 7, role: 'ADMIN', email: 'admin@example.com', fullName: 'Admin' };
  const context = {
    Headers,
    DOMException,
    AbortController,
    Blob,
    window: { addEventListener() {} },
    localStorage: { getItem: () => null, removeItem() {}, setItem() {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => user }),
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
  return compile('../src/lib/api.ts', (name) => {
    if (name === 'axios') return axios;
    if (name === './session') return session;
    if (name === '../i18n/core') return { getBrowserLocale: () => 'vi', getErrorMessage: () => '' };
    throw new Error(`Unexpected import: ${name}`);
  });
}

test('reportsApi forwards filter params and abort signals for dashboard and revenue', async () => {
  const { api, reportsApi } = loadApiModule();
  const seen = [];
  api.defaults.adapter = async (config) => {
    seen.push({ url: config.url, params: config.params, signal: config.signal });
    return { status: 200, data: { totalRevenue: 450000, items: [] }, headers: {}, config };
  };

  const controller = new AbortController();
  const dash = await reportsApi.getDashboard(
    { storeId: 3, from: '2026-11-01', to: '2026-11-05' },
    controller.signal
  );
  const rev = await reportsApi.getRevenue(
    { storeId: 3, from: '2026-11-01', to: '2026-11-05' },
    controller.signal
  );

  assert.equal(dash.totalRevenue, 450000);
  assert.equal(rev.totalRevenue, 450000);
  assert.equal(seen[0].url, '/api/reports/dashboard');
  assert.deepEqual(seen[0].params, { storeId: 3, from: '2026-11-01', to: '2026-11-05' });
  assert.equal(seen[0].signal, controller.signal);
  assert.equal(seen[1].url, '/api/reports/revenue');
});

test('reportsApi.exportReport validates binary blob MIME and decodes JSON Blob errors', async () => {
  const { api, reportsApi } = loadApiModule();

  api.defaults.adapter = async (config) => ({
    status: 200,
    data: new Blob(['%PDF-1.4\n'], { type: 'application/pdf' }),
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="revenue-report-store3-2026-11-01-2026-11-05.pdf"',
    },
    config,
  });

  const exported = await reportsApi.exportReport({
    format: 'pdf',
    storeId: 3,
    from: '2026-11-01',
    to: '2026-11-05',
  });
  assert.equal(exported.filename, 'revenue-report-store3-2026-11-01-2026-11-05.pdf');
  assert.ok(exported.blob.size > 0);

  api.defaults.adapter = async (config) => ({
    status: 200,
    data: new Blob(['<html>error</html>'], { type: 'text/html' }),
    headers: { 'content-type': 'text/html' },
    config,
  });

  await assert.rejects(
    () => reportsApi.exportReport({ format: 'xlsx', from: '2026-11-01', to: '2026-11-05' }),
    (err) => err?.code === 'UPSTREAM_ERROR'
  );

  api.defaults.adapter = async (config) => {
    const errorBlob = new Blob([JSON.stringify({ code: 'FORBIDDEN', status: 403 })], {
      type: 'application/json',
    });
    throw new axios.AxiosError('forbidden', 'ERR_BAD_REQUEST', config, null, {
      status: 403,
      data: errorBlob,
      headers: { 'content-type': 'application/json' },
      config,
    });
  };

  await assert.rejects(
    () => reportsApi.exportReport({ format: 'pdf', from: '2026-11-01', to: '2026-11-05' }),
    (err) => err?.response?.data?.code === 'FORBIDDEN'
  );
});
