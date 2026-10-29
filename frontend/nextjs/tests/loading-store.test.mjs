import test from "node:test";
import assert from "node:assert/strict";
import { createLoadingStore } from "../components/ui-loader/loading-store.ts";
import { navigationKey } from "../components/ui-loader/navigation-key.ts";

test("an old completion cannot stop another pending route/fallback", () => {
  const loading = createLoadingStore();
  const finishA = loading.begin();
  const finishB = loading.begin();
  finishA();
  finishA();
  assert.equal(loading.getSnapshot(), true);
  finishB();
  assert.equal(loading.getSnapshot(), false);
});

test("scope reset and late request callbacks do not affect new work", () => {
  const loading = createLoadingStore();
  const oldResponse = loading.begin();
  loading.reset();
  const newResponse = loading.begin();
  oldResponse();
  assert.equal(loading.getSnapshot(), true);
  newResponse();
  assert.equal(loading.getSnapshot(), false);
});

test("shell subscribers update only when pending changes, and can unsubscribe", () => {
  const loading = createLoadingStore();
  const states = [];
  const unsubscribe = loading.subscribe(() =>
    states.push(loading.getSnapshot()),
  );
  const route = loading.begin(),
    fallback = loading.begin();
  route();
  fallback();
  assert.deepEqual(states, [true, false]);
  unsubscribe();
  loading.begin();
  loading.reset();
  assert.deepEqual(states, [true, false]);
  assert.equal(loading.getServerSnapshot(), false);
});

test("history fragment and equivalent query encoding are not route work", () => {
  assert.equal(
    navigationKey(new URL("https://clucky.test/menu?q=ga%20ran#a")),
    navigationKey(new URL("https://clucky.test/menu?q=ga+ran#b")),
  );
  assert.notEqual(
    navigationKey(new URL("https://clucky.test/menu?q=ga")),
    navigationKey(new URL("https://clucky.test/menu?q=burger")),
  );
});
