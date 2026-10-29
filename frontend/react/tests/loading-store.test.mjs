import test from "node:test";
import assert from "node:assert/strict";
import { createLoadingStore } from "../src/components/ui-loader/loading-store.ts";

test("completion and cleanup of one request cannot clear another", () => {
  const store = createLoadingStore();
  const finishA = store.begin(),
    finishB = store.begin();
  finishA();
  finishA();
  assert.equal(store.getSnapshot(), true);
  finishB();
  assert.equal(store.getSnapshot(), false);
});

test("role/route scope and late callbacks remain isolated", () => {
  const oldScope = createLoadingStore(),
    newScope = createLoadingStore();
  const finishOld = oldScope.begin(),
    finishNew = newScope.begin();
  oldScope.reset();
  finishOld();
  assert.equal(newScope.getSnapshot(), true);
  finishNew();
  assert.equal(newScope.getSnapshot(), false);
});

test("busy notifications do not repeat for every overlapping task", () => {
  const store = createLoadingStore(),
    changes = [];
  const unsubscribe = store.subscribe(() => changes.push(store.getSnapshot()));
  const first = store.begin(),
    second = store.begin();
  second();
  first();
  unsubscribe();
  store.begin();
  assert.deepEqual(changes, [true, false]);
});
