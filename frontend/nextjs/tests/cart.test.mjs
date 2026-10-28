import test from "node:test";
import assert from "node:assert/strict";
import { addCartItem, cartTotals } from "../lib/cart.ts";

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
