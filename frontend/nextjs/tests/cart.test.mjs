import test from "node:test";
import assert from "node:assert/strict";
import { addCartItem, cartTotals, mapBackendCart, toCartPayload, catalogSelectionId } from "../lib/cart.ts";

test("catalog option and topping IDs become numeric cart IDs without accepting malformed IDs", () => {
  assert.equal(catalogSelectionId("opt-8", "opt"), 8);
  assert.equal(catalogSelectionId("top-3", "top"), 3);
  assert.equal(catalogSelectionId("8", "opt"), 8);
  for (const invalid of ["opt-0", "opt--1", "opt-8oops", "top-8", "8.2", "", "9007199254740992"]) {
    assert.ok(Number.isNaN(catalogSelectionId(invalid, "opt")));
  }
  const payload = toCartPayload({ productId: 3, quantity: 1, unitPrice: 69000,
    name: "Burger", optionIds: [catalogSelectionId("opt-8", "opt")], toppingIds: [catalogSelectionId("top-3", "top")] });
  assert.deepEqual(payload.optionIds, [8]);
  assert.deepEqual(payload.toppingIds, [3]);
  assert.throws(() => toCartPayload({ ...payload, optionIds: [catalogSelectionId("bad", "opt")] }));
});

test("checkout preserves combo and selection IDs without guessing IDs from a slug", () => {
  const combo = { id: "uuid", slug: "combo-999", comboId: 1, name: "Combo", quantity: 2, unitPrice: 100 };
  assert.deepEqual(toCartPayload(combo), {
    productId: undefined, comboId: 1, itemName: "Combo", quantity: 2,
    unitPrice: 100, optionIds: [], toppingIds: [], note: undefined,
  });
  assert.throws(() => toCartPayload({ ...combo, productId: 1 }));
  assert.throws(() => toCartPayload({ ...combo, comboId: undefined }));
  assert.throws(() => toCartPayload({ ...combo, quantity: 0 }));
  const product = { ...combo, comboId: undefined, productId: 7, optionIds: [11], toppingIds: [22] };
  assert.deepEqual(toCartPayload(product).optionIds, [11]);
  assert.deepEqual(toCartPayload(product).toppingIds, [22]);
});

test("server cart keys replace local UUIDs without losing variant images or labels", () => {
  const previous = [
    { id: "uuid-a", productId: 1, optionIds: [11], toppingIds: [22], image: "/a.png", options: [{ id: 11, name: "Hot" }] },
    { id: "uuid-b", productId: 1, optionIds: [12], toppingIds: [], image: "/b.png" },
  ];
  const items = [
    { itemKey: "server-b", productId: 1, optionIds: [12], toppingIds: [], itemName: "Chicken", unitPrice: 100, quantity: 1 },
    { itemKey: "server-a", productId: 1, comboId: null, optionIds: [11], toppingIds: [22], itemName: "Chicken", unitPrice: 120, quantity: 3 },
  ];
  const mapped = mapBackendCart({ items }, previous);
  assert.equal(mapped[0].id, "server-b");
  assert.equal(mapped[1].itemKey, "server-a");
  assert.equal(mapped[0].image, "/b.png");
  assert.equal(mapped[1].image, "/a.png");
  assert.deepEqual(mapped[1].options, previous[0].options);
  assert.equal(mapped[1].quantity, 3);
  assert.deepEqual(mapBackendCart({ items: [] }, previous), []);
});

const portion = {
  id: "chicken-1",
  slug: "ga-gion",
  name: "Gà giòn",
  category: "Gà",
  basePrice: 89000,
  unitPrice: 104000,
  quantity: 2,
  image: "/chicken.png",
  options: [{ groupName: "Độ cay", name: "Cay vừa", extraPrice: 0 }],
  toppings: [{ name: "Sốt phô mai", extraPrice: 15000 }],
  note: "Sốt riêng",
};

test("adding the same configured dish accumulates quantity without changing the existing row ID", () => {
  const result = addCartItem([portion], {
    ...portion,
    id: "second-click",
    quantity: 3,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, portion.id);
  assert.deepEqual(cartTotals(result), { count: 5, subtotal: 520000 });
  assert.equal(portion.quantity, 2);
});

test("different options, toppings, notes or prices stay as separate portions", () => {
  const variants = [
    {
      ...portion,
      id: "spicy",
      options: [{ groupName: "Độ cay", name: "Siêu cay", extraPrice: 0 }],
    },
    { ...portion, id: "no-topping", toppings: [] },
    { ...portion, id: "note", note: "Ít sốt" },
    { ...portion, id: "price-change", unitPrice: 109000 },
  ];
  for (const variant of variants)
    assert.equal(addCartItem([portion], variant).length, 2);
});

test("badge counts portions rather than rows, totals include the configured unit price", () => {
  assert.deepEqual(
    cartTotals([
      portion,
      { ...portion, id: "drink", unitPrice: 25000, quantity: 3 },
    ]),
    { count: 5, subtotal: 283000 },
  );
});

test("empty cart has no phantom count or amount", () => {
  assert.deepEqual(cartTotals([]), { count: 0, subtotal: 0 });
});
