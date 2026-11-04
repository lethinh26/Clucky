import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import axios from 'axios';

test('cookie-auth requests omit stale bearer tokens while business requests retain them', async () => {
  const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
    .replace('import.meta.env.VITE_API_URL', 'undefined');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    localStorage: { getItem: () => 'expired-access-token' },
    require: (name) => {
      if (name === 'axios') return axios;
      if (name === '../i18n/core') return { getBrowserLocale: () => 'vi', getErrorMessage: () => '' };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const { api, authApi } = module.exports;
  const requests = [];
  api.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, statusText: 'OK', data: {}, headers: {}, config };
  };
  await authApi.refresh();
  await authApi.logout();
  await authApi.login({ email: 'test@example.com', password: 'Password1' });
  await api.post('/api/auth/refresh', undefined, { headers: { Authorization: 'Bearer stale' } });
  for (const request of requests) {
    assert.equal(request.headers.get('Authorization'), undefined);
    assert.equal(request.withCredentials, true);
  }
  await api.get('/api/orders');
  assert.equal(requests.at(-1).headers.get('Authorization'), 'Bearer expired-access-token');
});
