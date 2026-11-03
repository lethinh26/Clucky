import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "contracts/errors.json"), "utf8"));
const entries = Object.entries(catalog);
for (const [code, value] of entries) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(code) || !Number.isInteger(value.httpStatus)
      || value.httpStatus < 400 || value.httpStatus > 599
      || Object.keys(value.messages ?? {}).sort().join() !== "en,vi"
      || ["vi", "en"].some((locale) => typeof value.messages[locale] !== "string" || !value.messages[locale].trim())) {
    throw new Error(`Invalid error contract: ${code}`);
  }
}
if (!catalog.INTERNAL_ERROR) throw new Error("INTERNAL_ERROR is required");
const defaultEntries = entries.filter(([, value]) => value.defaultForStatus === true);
if (new Set(defaultEntries.map(([, value]) => value.httpStatus)).size !== defaultEntries.length) {
  throw new Error("Only one default error is allowed per HTTP status");
}
const defaults = Object.fromEntries(defaultEntries
    .map(([code, value]) => [value.httpStatus, code]));
for (const [, value] of entries) {
  if (!defaults[value.httpStatus]) throw new Error(`Missing default error for HTTP ${value.httpStatus}`);
}
const modules = ["api-gateway", "identity-service", "catalog-store-service", "cart-order-service",
  "payment-service", "promotion-loyalty-service", "shipping-service", "notification-service", "review-report-service", "audit-service"];
const outputs = new Map();
for (const module of modules) {
  const packageName = `com.clucky.${module.replaceAll("-", "")}.exception`;
  const constants = entries.map(([code, value]) => `    ${code}(${value.httpStatus}, ${JSON.stringify(value.messages.en)})`).join(",\n");
  outputs.set(`backend/${module}/src/main/java/${packageName.replaceAll(".", "/")}/ErrorCode.java`,
`package ${packageName};

@javax.annotation.processing.Generated("scripts/generate-errors.mjs")
public enum ErrorCode {
${constants};

    private final int httpStatus;
    private final String message;

    ErrorCode(int httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }

    public int httpStatus() { return httpStatus; }
    public String message() { return message; }

    public static ErrorCode fromStatus(int status) {
        return switch (status) {
${Object.entries(defaults).map(([status, code]) => `            case ${status} -> ${code};`).join("\n")}
            default -> INTERNAL_ERROR;
        };
    }
}
`);
}
const typescript = `export const generatedBy = "scripts/generate-errors.mjs";
export const errorCatalog = ${JSON.stringify(Object.fromEntries(entries.map(([code, value]) => [code, { httpStatus: value.httpStatus }])), null, 2)} as const;
export type ErrorCode = keyof typeof errorCatalog;
export const defaultErrorCodes: Readonly<Record<number, ErrorCode>> = ${JSON.stringify(defaults, null, 2)};
`;
for (const path of ["frontend/nextjs/lib/i18n/error-codes.generated.ts", "frontend/react/src/i18n/error-codes.generated.ts"]) {
  outputs.set(path, typescript);
}
for (const app of ["frontend/nextjs", "frontend/react/src"]) {
  for (const locale of ["vi", "en"]) {
    outputs.set(`${app}/locales/${locale}/errors.generated.json`,
      JSON.stringify(Object.fromEntries(entries.map(([code, value]) => [code, value.messages[locale]])), null, 2) + "\n");
  }
}
const patches = [];
let stale = false;
for (const [path, content] of outputs) {
  const absolute = resolve(root, path);
  const old = existsSync(absolute) ? readFileSync(absolute, "utf8").replaceAll("\r\n", "\n") : null;
  if (old === content) continue;
  stale = true;
  if (process.argv.includes("--patches")) {
    const prior = old === null ? `*** Add File: ${path}\n` : `*** Update File: ${path}\n@@\n${old.trimEnd().split("\n").map(line => `-${line}\n`).join("")}`;
    patches.push(`*** Begin Patch\n${prior}${content.trimEnd().split("\n").map(line => `+${line}\n`).join("")}*** End Patch\n`);
  } else if (process.argv.includes("--check")) {
    console.error(`Stale generated file: ${path}`);
  } else {
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}
if (process.argv.includes("--patches")) console.log(JSON.stringify(patches));
if (process.argv.includes("--check") && stale) process.exitCode = 1;
