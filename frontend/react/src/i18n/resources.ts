import viBusiness from "../locales/vi/business.json" with { type: "json" };
import enBusiness from "../locales/en/business.json" with { type: "json" };
import viCommon from "../locales/vi/common.json" with { type: "json" };
import viAuth from "../locales/vi/auth.json" with { type: "json" };
import viHome from "../locales/vi/home.json" with { type: "json" };
import viMenu from "../locales/vi/menu.json" with { type: "json" };
import viAdmin from "../locales/vi/admin.json" with { type: "json" };
import viOrders from "../locales/vi/orders.json" with { type: "json" };
import viErrors from "../locales/vi/errors.generated.json" with { type: "json" };
import enCommon from "../locales/en/common.json" with { type: "json" };
import enAuth from "../locales/en/auth.json" with { type: "json" };
import enHome from "../locales/en/home.json" with { type: "json" };
import enMenu from "../locales/en/menu.json" with { type: "json" };
import enAdmin from "../locales/en/admin.json" with { type: "json" };
import enOrders from "../locales/en/orders.json" with { type: "json" };
import enErrors from "../locales/en/errors.generated.json" with { type: "json" };

import viMaps from "../locales/vi/maps.json" with { type: "json" };
import viLoyalty from "../locales/vi/loyalty.json" with { type: "json" };
import enLoyalty from "../locales/en/loyalty.json" with { type: "json" };
import enMaps from "../locales/en/maps.json" with { type: "json" };
import viAccounts from "../locales/vi/accounts.json" with { type: "json" };
import enAccounts from "../locales/en/accounts.json" with { type: "json" };
import viPayments from "../locales/vi/payments.json" with { type: "json" };
import enPayments from "../locales/en/payments.json" with { type: "json" };
import viShipping from "../locales/vi/shipping.json" with { type: "json" };
import enShipping from "../locales/en/shipping.json" with { type: "json" };

export const resources = {
  vi: { shipping: viShipping, payments: viPayments, accounts: viAccounts, loyalty: viLoyalty, maps: viMaps, business: viBusiness, common: viCommon, auth: viAuth, home: viHome, menu: viMenu, admin: viAdmin, orders: viOrders, errors: viErrors },
  en: { shipping: enShipping, payments: enPayments, accounts: enAccounts, loyalty: enLoyalty, maps: enMaps, business: enBusiness, common: enCommon, auth: enAuth, home: enHome, menu: enMenu, admin: enAdmin, orders: enOrders, errors: enErrors },
};
