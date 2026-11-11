import { test, expect } from "@playwright/test";

for (const role of ["ADMIN", "STAFF"]) {
  test(`${role} reviews shared-account suggestions and assigns by order code`, async ({ page }) => {
    const expires = new Date(Date.now() + 600000).toISOString();
    let receipt = { id: "7", transactionId: "SEPAY:LOG-7", amount: 50000, direction: "in", bank: "VCB", maskedAccount: "****1234",
      content: "Customer transfer", receivedAt: "2026-11-10T01:00:00Z", bankOccurredAt: "2026-11-10T01:00:00Z", status: "UNMATCHED",
      reason: "REFERENCE_NOT_FOUND", storeId: null as number | null, matchedOrderCode: null as string | null, candidateOrderCode: null,
      replayCount: 0, conflictCount: 0, version: 4, bankStoreIds: [1, 2], bankScopeSource: "RECEIVED_SNAPSHOT", canAssign: true,
      assignedBy: null as number | null, assignedAt: null as string | null, assignmentReason: null as string | null };
    const assignments: unknown[] = [];
    let unknownFilter = false;
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === `/api/payments/10/operations/${role === "ADMIN" ? "reconcile" : "assign"}`) {
        expect(route.request().method()).toBe("POST");
        expect(route.request().headers()["idempotency-key"]).toBeTruthy();
        const body = route.request().postDataJSON(); assignments.push(body);
        receipt = { ...receipt, status: "MATCHED", storeId: 2, matchedOrderCode: "ORD-10", canAssign: false, version: 5,
          assignedBy: 5, assignedAt: "2026-11-10T01:05:00Z", assignmentReason: body.reason };
        return route.fulfill({ json: { allocated: true } });
      }
      if (url.pathname === "/api/payments/transactions") unknownFilter ||= url.searchParams.get("unclassifiedOnly") === "true";
      const data: Record<string, unknown> = {
        "/api/auth/session": { userId: 5, role, storeId: role === "ADMIN" ? null : 2, fullName: "Operator" },
        "/api/stores": [{ id: 1, name: "Branch One", address: "Street One" }, { id: 2, name: "Branch Two", address: "Street Two" }],
        "/api/payments/bank-config": { accounts: [], assignments: [], sepayKeyConfigured: true },
        "/api/payments/transactions": { page: { content: [receipt], totalElements: 1 }, lastReceivedAt: receipt.receivedAt },
        "/api/payments/transactions/7": receipt,
        "/api/orders/code/ORD-10": { id: 10 },
        "/api/payments/10/operations": {
          order: { orderId: 10, orderCode: "ORD-10", storeId: 2, amount: 70000, status: "PENDING_PAYMENT", paymentStatus: "PENDING", expiresAt: expires },
          payments: [{ id: 20, version: 3, live_payment: true, method: "BANK_TRANSFER", status: "PENDING", amount: 70000, received_amount: 20000, expires_at: expires }],
        },
      };
      return route.fulfill({ json: data[url.pathname] ?? [] });
    });
    await page.goto("http://127.0.0.1:4173/admin/payments");
    await expect(page.getByRole("tab", { name: "Thu quầy & đối soát", exact: true })).toHaveCount(0);
    await page.getByText("Chưa rõ chi nhánh", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "Chưa rõ chi nhánh", exact: true })).toBeChecked();
    await expect.poll(() => unknownFilter).toBe(true);
    await page.getByRole("button", { name: "Chi tiết", exact: true }).click();
    const drawer = page.getByRole("dialog").filter({ has: page.locator(".payment-receipt-amount") });
    await expect(drawer.getByText("Branch One", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Branch Two", { exact: true })).toBeVisible();
    await expect(drawer.getByText(/chỉ để tham khảo/)).toBeVisible();
    if (role === "ADMIN") {
      await drawer.getByLabel("Mã đơn cần thu tiền / đối soát / tiếp nhận legacy", { exact: true }).fill("ORD-10");
      await drawer.getByRole("button", { name: "Mở tài chính đơn", exact: true }).click();
      const finance = page.getByRole("dialog", { name: /TÀI CHÍNH & HOÀN TIỀN/ });
      await expect(finance).toBeVisible();
      await finance.getByRole("button", { name: "Đối soát biên nhận", exact: true }).click();
      await expect(finance.getByText("SEPAY:LOG-7", { exact: true })).toBeVisible();
      await finance.getByLabel("3. Căn cứ xác nhận giao dịch", { exact: true }).fill("Checked customer receipt");
      await finance.getByRole("button", { name: "Kiểm tra & xác nhận", exact: true }).click();
      const confirmation = page.getByRole("dialog", { name: /^Xác nhận đối soát giao dịch/ });
      await expect(confirmation.getByText("Checked customer receipt", { exact: true })).toBeVisible();
      await confirmation.getByRole("button", { name: "Xác nhận đối soát", exact: true }).click();
      await expect(finance.getByText("Đã ghi nhận đối soát. Xem trạng thái đơn và bằng chứng ngân hàng cập nhật bên dưới.", { exact: true })).toBeVisible();
      await finance.locator(".ant-modal-close").click();
      await expect(finance).toHaveCount(0);
      await expect(drawer).toBeVisible();
    } else {
      await drawer.getByLabel("Mã đơn hàng", { exact: true }).fill("ORD-10");
      await drawer.getByRole("button", { name: "Tìm đơn", exact: true }).click();
      await expect(drawer.getByText("ORD-10", { exact: true })).toBeVisible();
      await expect(drawer.getByRole("button", { name: "Xác nhận gán giao dịch", exact: true })).toBeDisabled();
      await drawer.getByLabel("Căn cứ xác nhận", { exact: true }).fill("Checked customer receipt");
      await drawer.getByRole("button", { name: "Xác nhận gán giao dịch", exact: true }).click();
      await page.locator(".ant-popconfirm").getByRole("button", { name: "Xác nhận gán giao dịch", exact: true }).click();
    }
    await expect(drawer.getByText(/Tài khoản #5 đã gán/)).toBeVisible();
    await expect(drawer.getByLabel("Mã đơn hàng", { exact: true })).toHaveCount(0);
    expect(assignments).toEqual([{ receiptId: 7, receiptVersion: 4, paymentId: 20, targetVersion: 3, reason: "Checked customer receipt", ...(role === "ADMIN" ? { acceptOriginalConflict: false } : {}) }]);
  });
}

for (const locale of ["vi", "en"] as const) {
  test(`Ant Design date filters preserve Vietnam day boundaries and clear (${locale})`, async ({ page, context }) => {
    await context.addCookies([{ name: "clucky_locale", value: locale, url: "http://127.0.0.1:4173" }]);
    await page.clock.setFixedTime(new Date("2026-11-10T05:00:00Z"));
    let filters = new URLSearchParams();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/payments/transactions") filters = url.searchParams;
      const data: Record<string, unknown> = {
        "/api/auth/session": { userId: 5, role: "STAFF", storeId: 2, fullName: "Operator" },
        "/api/payments/transactions": { page: { content: [], totalElements: 0 }, lastReceivedAt: null },
      };
      return route.fulfill({ json: data[url.pathname] ?? [] });
    });
    await page.goto("http://127.0.0.1:4173/admin/payments");
    const from = page.getByLabel(locale === "vi" ? "Từ ngày" : "From date", { exact: true });
    const to = page.getByLabel(locale === "vi" ? "Đến ngày" : "To date", { exact: true });
    await from.click();
    const calendar = page.locator(".ant-picker-dropdown:visible");
    await expect(calendar).toBeVisible();
    await calendar.locator('.ant-picker-cell-in-view[title="2026-11-10"]').click();
    await expect(from).toHaveValue("10/11/2026");
    await expect.poll(() => filters.get("from")).toBe("2026-11-10T00:00:00+07:00");
    await expect(calendar).toHaveCount(0);
    await to.click();
    await calendar.locator('.ant-picker-cell-in-view[title="2026-11-12"]').click();
    await expect(to).toHaveValue("12/11/2026");
    await expect.poll(() => filters.get("to")).toBe("2026-11-12T23:59:59.999+07:00");
    const fromPicker = page.locator(".ant-picker").filter({ has: from });
    await fromPicker.hover();
    await fromPicker.getByRole("button", { name: locale === "vi" ? "Xóa" : "Clear", exact: true }).click();
    await expect(from).toHaveValue("");
    await expect.poll(() => filters.get("from")).toBeNull();
    expect(filters.get("to")).toBe("2026-11-12T23:59:59.999+07:00");
    expect(errors).toEqual([]);
  });
}
