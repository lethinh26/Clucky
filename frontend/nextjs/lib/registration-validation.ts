import type { RegisterPayload } from "./api";

export type RegistrationErrors = Partial<Record<keyof RegisterPayload, string[]>>;

export function passwordChecks(password: string) {
  const length = Array.from(password).length;
  return {
    minLength: length >= 8,
    maxLength: length <= 72 && new TextEncoder().encode(password).length <= 72,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    noLineBreak: !/[\r\n\u0085\u2028\u2029]/.test(password),
  };
}

export function validateRegistration(values: RegisterPayload): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const phone = (values.phone ?? "").replace(/\s/g, "");
  if (!fullName) errors.fullName = ["auth.validation.fullNameRequired"];
  else if (fullName.length > 160) errors.fullName = ["auth.validation.fullNameTooLong"];
  if (!email) errors.email = ["auth.validation.emailRequired"];
  else if (email.length > 255) errors.email = ["auth.validation.emailTooLong"];
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ["auth.validation.checkEmail"];
  if (phone && !/^0[0-9]{9,10}$/.test(phone)) errors.phone = ["auth.validation.phoneFormat"];
  const passwordErrors: string[] = [];
  if (!values.password) passwordErrors.push("auth.validation.passwordRequired");
  else {
    const checks = passwordChecks(values.password);
    if (!checks.minLength) passwordErrors.push("auth.validation.minimumPassword");
    if (!checks.maxLength) passwordErrors.push("auth.validation.passwordTooLong");
    if (!checks.uppercase) passwordErrors.push("auth.validation.passwordUppercase");
    if (!checks.lowercase) passwordErrors.push("auth.validation.passwordLowercase");
    if (!checks.number) passwordErrors.push("auth.validation.passwordNumber");
    if (!checks.noLineBreak) passwordErrors.push("auth.validation.passwordLineBreak");
  }
  if (passwordErrors.length) errors.password = passwordErrors;
  return errors;
}

export function registrationServerErrors(error: unknown): RegistrationErrors {
  if (!error || typeof error !== "object" || !("code" in error)) return {};
  if (error.code === "EMAIL_EXISTS") return { email: ["auth.validation.emailExists"] };
  if (!("fieldErrors" in error) || !error.fieldErrors || typeof error.fieldErrors !== "object") return {};
  if (error.code === "RESOURCE_CONFLICT" && Object.hasOwn(error.fieldErrors, "phone")
      && "phone" in error.fieldErrors && error.fieldErrors.phone === "ALREADY_EXISTS") {
    return { phone: ["auth.validation.phoneExists"] };
  }
  if (error.code !== "VALIDATION_ERROR") return {};
  const messages = {
    fullName: "auth.validation.fullNamePolicy",
    email: "auth.validation.emailPolicy",
    phone: "auth.validation.phoneFormat",
    password: "auth.validation.passwordPolicy",
  };
  const errors: RegistrationErrors = {};
  for (const field of Object.keys(messages) as (keyof typeof messages)[]) {
    if (Object.hasOwn(error.fieldErrors, field)) errors[field] = [messages[field]];
  }
  return errors;
}
