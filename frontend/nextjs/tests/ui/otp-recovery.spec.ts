import { expect, test } from "@playwright/test";
import { seedApi } from "../fixtures/api";

const customer = "http://127.0.0.1:4174";

test.beforeEach(async ({ page }) => {
  // The test harness intercepts every auth request. No real OTP is sent.
  await seedApi(page);
});

test("forgot-password UI is responsive and sends a normalized SMS recovery request", async ({ page }) => {
  const submitted: unknown[] = [];
  await page.route("**/api/auth/forgot-password", route => {
    submitted.push(route.request().postDataJSON());
    return route.fulfill({ json: { challengeId: "test-recovery-sms" } });
  });

  await page.goto(customer + "/forgot-password");
  await expect(page.getByRole("heading", { name: "Quên mật khẩu" })).toBeVisible();
  await expect(page.getByText("Tin nhắn SMS", { exact: true })).toBeVisible();
  await expect(page.getByText("Email đã xác thực", { exact: true })).toBeVisible();

  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 820 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }

  await page.getByLabel("Số điện thoại nhận OTP").fill("0901 234 567");
  await page.getByRole("button", { name: /Tiếp tục nhận mã OTP/ }).click();
  await expect.poll(() => submitted).toEqual([{ channel: "SMS", phone: "0901234567" }]);
  await expect(page).toHaveURL(/\/reset-password\?channel=SMS&phone=0901234567&challengeId=test-recovery-sms/);
});

test("forgot-password email flow uses only the selected verified-email channel", async ({ page }) => {
  const submitted: unknown[] = [];
  await page.route("**/api/auth/forgot-password", route => {
    submitted.push(route.request().postDataJSON());
    return route.fulfill({ json: { challengeId: "test-recovery-email" } });
  });
  await page.goto(customer + "/forgot-password");
  await page.getByText("Email đã xác thực", { exact: true }).click();
  await expect(page.locator('input[name="channel"][value="EMAIL"]')).toBeChecked();
  await page.getByLabel("Email liên hệ (xác thực OTP)").fill("example@clucky.test");
  await page.getByRole("button", { name: /Tiếp tục nhận mã OTP/ }).click();
  await expect.poll(() => submitted).toEqual([{ channel: "EMAIL", email: "example@clucky.test" }]);
  await expect(page).toHaveURL(/\/reset-password\?channel=EMAIL&email=example%40clucky.test&challengeId=test-recovery-email/);
});

test("invalid password login displays only the neutral localized error", async ({ page }) => {
  let payload: unknown;
  await page.route("**/api/auth/login", route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 401, json: { code: "INVALID_CREDENTIALS", message: "do not show backend details" } });
  });
  await page.goto(customer + "/login");
  await page.getByLabel("Số điện thoại hoặc email").fill("0901234567");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("NotTheRightPassword1");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".form-error")).toHaveText("Thông tin đăng nhập chưa hợp lệ");
  await expect(page.locator(".form-error")).not.toContainText("do not show backend details");
  expect(payload).toEqual({ email: "0901234567", password: "NotTheRightPassword1" });
});

test("phone-first registration requires SMS OTP and verifies its challenge", async ({ page }) => {
  const submitted: unknown[] = [];
  await page.route("**/api/auth/register", route => {
    submitted.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { challengeId: "test-register-challenge" } });
  });
  await page.route("**/api/auth/verify-otp", route => {
    submitted.push(route.request().postDataJSON());
    return route.fulfill({ json: { userId: 1, role: "CUSTOMER", fullName: "Test User", email: null } });
  });
  await page.goto(customer + "/register");
  await page.getByLabel("Họ và tên").fill("Nguyễn Văn An");
  await page.getByLabel("Số điện thoại nhận OTP").fill("0901 234 567");
  await page.locator('input[name="password"]').fill("Password1");
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-otp\?phone=0901234567&challengeId=test-register-challenge/);
  expect(submitted[0]).toEqual({ fullName: "Nguyễn Văn An", phone: "0901234567", password: "Password1" });
  const digits = page.getByRole("group", { name: "Mã OTP" }).locator("input");
  for (const [index, digit] of [..."123456"].entries()) await digits.nth(index).fill(digit);
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect.poll(() => submitted.length).toBe(2);
  expect(submitted[1]).toEqual({ phone: "0901234567", otp: "123456", challengeId: "test-register-challenge" });
});

test("changing a verified phone demands both new-number OTP and the Clucky password", async ({ page }) => {
  const confirmations: Array<Record<string, string>> = [];
  let correctPassword = false;
  await page.route("**/api/users/me", route => route.fulfill({ json: {
    fullName: "Test User", email: "test@example.com", phone: "+84901234567",
    phoneVerified: true, emailVerified: true,
  } }));
  await page.route("**/api/users/me/phone/request", route => {
    expect(route.request().postDataJSON()).toEqual({ phone: "+84987654321" });
    return route.fulfill({ json: { challengeId: "mock-phone-bind" } });
  });
  await page.route("**/api/users/me/phone/verify", route => {
    const payload = route.request().postDataJSON() as Record<string, string>;
    confirmations.push(payload);
    return correctPassword
      ? route.fulfill({ json: {
          fullName: "Test User", email: "test@example.com", phone: "+84987654321",
          phoneVerified: true, emailVerified: true,
        } })
      : route.fulfill({ status: 400, json: {
          code: "VALIDATION_ERROR", fieldErrors: { currentPassword: "INVALID" },
        } });
  });
  await page.goto(customer + "/account");
  await page.getByLabel("Số điện thoại muốn sử dụng").fill("0987 654 321");
  await page.getByRole("button", { name: "Gửi mã OTP qua SMS" }).click();
  await page.getByLabel("Mã OTP").first().fill("123456");
  const currentPassword = page.getByLabel("Mật khẩu Clucky hiện tại").first();
  await expect(page.getByRole("button", { name: "Xác thực và lưu số điện thoại" })).toBeDisabled();
  await currentPassword.fill("not-the-right-password");
  await page.getByRole("button", { name: "Xác thực và lưu số điện thoại" }).click();
  await expect(page.getByText("Mật khẩu Clucky hiện tại chưa đúng. Vui lòng kiểm tra lại.")).toBeVisible();
  expect(confirmations[0]).toEqual({
    phone: "+84987654321", otp: "123456", challengeId: "mock-phone-bind",
    currentPassword: "not-the-right-password",
  });
  correctPassword = true;
  await currentPassword.fill("CorrectCluckyPassword1");
  await page.getByRole("button", { name: "Xác thực và lưu số điện thoại" }).click();
  await expect.poll(() => confirmations.length).toBe(2);
  await expect(page.getByText("Số điện thoại mới đã được xác thực và lưu.")).toBeVisible();
});
