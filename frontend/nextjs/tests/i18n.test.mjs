import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { getErrorMessage, normalizeLocale, formatMoney, formatDate } from '../lib/i18n/core.ts';
import { getTranslator } from '../lib/i18n/translator.ts';
import { resources } from '../lib/i18n/resources.ts';
import { errorCatalog, defaultErrorCodes } from '../lib/i18n/error-codes.generated.ts';

test('known API errors use the selected language, never backend messages', () => {
  const error = { status: 409, code: 'VOUCHER_EXPIRED', message: 'secret SQL exception' };
  assert.equal(getErrorMessage(error, 'vi'), 'Mã giảm giá đã hết hạn.');
  assert.equal(getErrorMessage(error, 'en'), 'This voucher has expired.');
  assert.equal(getErrorMessage({ response: { status: 409, data: error } }, 'en'), 'This voucher has expired.');
});

test('unknown and malformed errors fall back safely', () => {
  assert.equal(getErrorMessage({ code: 'UNKNOWN', status: 403 }, 'en'), resources.en.errors.FORBIDDEN);
  for (const error of [null, 'sensitive error', new Error('secret'), { code: '__proto__', message: 'secret' }]) {
    assert.equal(getErrorMessage(error, 'en'), resources.en.errors.INTERNAL_ERROR);
  }
  assert.equal(getErrorMessage({ code: 'NETWORK_ERROR' }, 'en'), resources.en.common.errors.network);
  assert.equal(getErrorMessage({ code: 'ECONNABORTED' }, 'en'), resources.en.common.errors.timeout);
  assert.equal(getErrorMessage({ code: 'auth/popup-blocked' }, 'en'), resources.en.auth.google.blocked);
});

test('generated statuses and translations agree with the central error contract', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../../contracts/errors.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(errorCatalog).sort(), Object.keys(catalog).sort());
  for (const locale of ['vi', 'en']) {
    assert.deepEqual(Object.keys(resources[locale].errors).sort(), Object.keys(catalog).sort());
    for (const [code, value] of Object.entries(catalog)) {
      assert.equal(errorCatalog[code].httpStatus, value.httpStatus);
      assert.equal(resources[locale].errors[code], value.messages[locale]);
      assert.equal(getErrorMessage({ code }, locale), value.messages[locale]);
    }
  }
  for (const [status, code] of Object.entries(defaultErrorCodes)) {
    assert.equal(errorCatalog[code].httpStatus, Number(status));
    assert.equal(catalog[code].defaultForStatus, true);
  }
});

test('library translation uses semantic keys, interpolation and isolated locales', () => {
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('fr'), 'vi');
  assert.equal(normalizeLocale(undefined), 'vi');
  assert.equal(getTranslator('en')('auth.login.action'), 'Sign in');
  assert.equal(getTranslator('vi')('auth.login.action'), 'Đăng nhập');
  assert.equal(getTranslator('en')('menu.product.view', { name: '<script>' }), 'View <script>');
  assert.equal(getTranslator('en')('auth.otp.resendCountdown', { seconds: 30 }), 'Resend in 30s');
  assert.equal(getTranslator('en')('auth.otp.description', { count: 6, email: 'test@example.com' }),
    'Enter the 6-digit code sent to test@example.com.');
  assert.equal(getTranslator('vi')('auth.login.action'), 'Đăng nhập');
});

test('both locales contain the same nonempty message keys and placeholders', () => {
  function compare(vietnamese, english) {
    assert.deepEqual(Object.keys(vietnamese).sort(), Object.keys(english).sort());
    for (const [key, value] of Object.entries(vietnamese)) {
      if (typeof value === 'object') compare(value, english[key]);
      else {
        assert.ok(value.trim());
        assert.equal(typeof english[key], 'string');
        assert.ok(english[key].trim());
        const placeholders = text => [...text.matchAll(/\{+(\w+)\}+/g)].map(match => match[1]).sort();
        assert.deepEqual(placeholders(value), placeholders(english[key]));
      }
    }
  }
  compare(resources.vi, resources.en);
});

test('date style presets render loyalty history without conflicting date components', () => {
  const value = '2026-11-09T18:30:00Z';
  for (const locale of ['vi', 'en']) {
    for (const options of [
      { dateStyle: 'medium', timeStyle: 'short' },
      { dateStyle: 'medium' },
      { timeStyle: 'short' },
      { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' },
    ]) {
      const expected = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
        timeZone: 'Asia/Ho_Chi_Minh', ...options,
      }).format(new Date(value));
      assert.equal(formatDate(value, locale, options), expected);
      assert.equal(formatDate('invalid', locale, options), '—');
    }
  }
});

test('formatters retain VND and use Vietnam time on both locales', () => {
  for (const locale of ['vi', 'en']) {
    assert.equal(formatMoney(125000, locale), new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(125000));
  }
  assert.equal(formatDate('2026-11-02T20:00:00Z', 'en'), '11/03/2026');
  assert.equal(formatDate('invalid', 'vi'), '—');
});

test('UI uses registered bilingual keys; Vietnamese literals are reviewed domain data only', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const allowed = JSON.parse(readFileSync(new URL('./i18n-domain-data.json', import.meta.url), 'utf8')).files;
  const vietnamese = /[À-ÖØ-öø-ỹ]/;
  const failures = [];
  function check(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!['i18n', 'locales', 'mock', 'mocks'].includes(entry.name)) check(path);
        continue;
      }
      if (!/\.tsx?$/.test(path) || entry.name === 'products.ts') continue;
      const file = relative(root, path).replaceAll('\\', '/');
      const source = readFileSync(path, 'utf8');
      const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      function visit(node) {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
          const value = ts.isJsxText(node) ? node.text.replace(/\s+/g, ' ').trim() : node.text;
          if (vietnamese.test(value) && !allowed[file]?.includes(value)) failures.push(`${file}: untranslated UI literal: ${value}`);
          if (/^(common|auth|home|menu|admin|orders|business|errors)[.:][\w.]+$/.test(value)) {
            for (const locale of ['vi', 'en']) {
              const translated = value.replace(':', '.').split('.').reduce((current, key) => current?.[key], resources[locale]);
              if (typeof translated !== 'string' || !translated.trim()) failures.push(`${file}: missing ${locale} translation ${value}`);
            }
          }
        }
        if (ts.isTemplateExpression(node) && [node.head.text, ...node.templateSpans.map(span => span.literal.text)].some(part => vietnamese.test(part))) {
          failures.push(`${file}: interpolate translated messages rather than Vietnamese templates`);
        }
        ts.forEachChild(node, visit);
      }
      visit(tree);
    }
  }
  for (const directory of ['app', 'components', 'lib']) check(join(root, directory));
  assert.deepEqual(failures, []);
});
