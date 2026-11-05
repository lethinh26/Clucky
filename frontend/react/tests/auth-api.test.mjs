import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import axios from 'axios';

test('concurrent admin 401s refresh once and replace the replayed bearer token', async () => {
  const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
    .replace('import.meta.env.VITE_API_URL', 'undefined');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  let token = 'expired';
  let refreshes = 0;
  let replays = 0;
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    localStorage: { getItem: () => token, setItem: (_key, value) => { token = value; } },
    require: (name) => name === 'axios' ? axios : { getBrowserLocale: () => 'vi', getErrorMessage: () => '' },
  });
  const { api } = module.exports;
  api.defaults.adapter = async (config) => {
    if (config.url === '/api/auth/refresh') {
      refreshes++;
      assert.equal(config.headers.get('Authorization'), undefined);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { status: 200, data: { accessToken: 'fresh' }, headers: {}, config };
    }
    if (config.headers.get('Authorization') !== 'Bearer fresh') {
      throw new axios.AxiosError('expired', 'ERR_BAD_REQUEST', config, null, { status: 401, config });
    }
    replays++;
    return { status: 200, data: {}, headers: {}, config };
  };
  await Promise.all([api.get('/api/orders'), api.get('/api/users/me')]);
  assert.equal(refreshes, 1);
  assert.equal(replays, 2);
});

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
  assert.equal(api.defaults.baseURL, '');
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
