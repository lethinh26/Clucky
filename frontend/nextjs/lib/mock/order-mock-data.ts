import { stores } from "../products";
import { CartItem, Order } from "../types/order";

export const INITIAL_CART_ITEMS: CartItem[] = [];

export const MOCK_STORES = stores
  .filter((store) => store.status === "OPEN")
  .map((store) => ({
    id: String(store.id),
    name: store.name,
    address: store.address,
  }));

const ORDER_FIXTURES: Order[] = [];

export const MOCK_ORDERS: Order[] = [];
