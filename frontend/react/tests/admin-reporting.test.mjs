import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('dashboard separates orders placed today from kitchen and completed revenue counts', async () => {
  const requests = [];
  const api = { get: async (_, config) => {
    requests.push(config.params);
    return { data: { content: [], totalElements: config.params.date ? 12 : config.params.status ? 2 : 50 } };
  } };
  const source = readFileSync(new URL('../src/lib/admin-reporting.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { exports: module.exports, require: () => ({ api }) });
  const result = await module.exports.getDashboardOrders(7);
  assert.equal(result.todayOrderCount, 12);
  assert.equal(result.activeKitchenCount, 6);
  assert.ok(requests.every(request => request.storeId === 7));
  assert.match(requests[4].date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(requests[4].status, undefined);
});
