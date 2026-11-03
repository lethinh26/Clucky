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

export const resources = {
  vi: { business: viBusiness, common: viCommon, auth: viAuth, home: viHome, menu: viMenu, admin: viAdmin, orders: viOrders, errors: viErrors },
  en: { business: enBusiness, common: enCommon, auth: enAuth, home: enHome, menu: enMenu, admin: enAdmin, orders: enOrders, errors: enErrors },
};
