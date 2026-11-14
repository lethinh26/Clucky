import assert from 'node:assert/strict';
import { validateRegistration, registrationServerErrors, passwordChecks } from '../lib/registration-validation.ts';
import { getTranslator } from '../lib/i18n/translator.ts';

const valid = { fullName: 'Nguyễn Văn An', phone: '0901 234 567', password: 'Password1' };
assert.deepEqual(validateRegistration(valid), {});
assert.deepEqual(validateRegistration({ ...valid, phone: '' }).phone, ['auth.validation.phoneRequired']);
assert.deepEqual(validateRegistration({ ...valid, fullName: '  An  ' }), {});
assert.deepEqual(validateRegistration({ ...valid, password: 'password1' }).password, ['auth.validation.passwordUppercase']);
assert.deepEqual(validateRegistration({ ...valid, password: 'PASSWORD1' }).password, ['auth.validation.passwordLowercase']);
assert.deepEqual(validateRegistration({ ...valid, password: 'Password' }).password, ['auth.validation.passwordNumber']);
assert.deepEqual(validateRegistration({ ...valid, password: 'Aa1' }).password, ['auth.validation.minimumPassword']);
assert.deepEqual(validateRegistration({ ...valid, password: 'Aa1😀😀😀' }).password, ['auth.validation.minimumPassword']);
assert.deepEqual(validateRegistration({ ...valid, password: '' }).password, ['auth.validation.passwordRequired']);
assert.deepEqual(validateRegistration({ ...valid, password: 'Aa1' + 'x'.repeat(69) }), {});
assert.ok(validateRegistration({ ...valid, password: 'Aa1' + 'x'.repeat(70) }).password.includes('auth.validation.passwordTooLong'));
assert.ok(validateRegistration({ ...valid, password: 'Aa1' + 'đ'.repeat(35) }).password.includes('auth.validation.passwordTooLong'));
assert.ok(validateRegistration({ ...valid, password: 'Password1\n' }).password.includes('auth.validation.passwordLineBreak'));
assert.ok(validateRegistration({ ...valid, fullName: ' ' }).fullName);
assert.ok(validateRegistration({ ...valid, fullName: 'a'.repeat(161) }).fullName);
assert.ok(validateRegistration({ ...valid, phone: '1234567890' }).phone);
assert.ok(validateRegistration({ ...valid, phone: '0901abc567' }).phone);
assert.ok(validateRegistration({ ...valid, phone: '09012345678' }).phone);

assert.deepEqual(passwordChecks(''), { minLength: false, maxLength: true, uppercase: false, lowercase: false, number: false, noLineBreak: true });
assert.equal(passwordChecks('a').lowercase, true);
assert.equal(passwordChecks('a').uppercase, false);
assert.equal(passwordChecks('aB').uppercase, true);
assert.equal(passwordChecks('aB').number, false);
assert.equal(passwordChecks('aB1').number, true);
assert.equal(passwordChecks('aB1').minLength, false);
assert.ok(Object.values(passwordChecks('aB123456')).every(Boolean));
assert.equal(passwordChecks('aB12345').minLength, false);
assert.equal(passwordChecks('Aa1' + 'đ'.repeat(35)).maxLength, false);
assert.equal(passwordChecks('Password1\n').noLineBreak, false);
assert.deepEqual(registrationServerErrors({ code: 'EMAIL_EXISTS' }), {});
assert.deepEqual(registrationServerErrors({ code: 'RESOURCE_CONFLICT', fieldErrors: { phone: 'ALREADY_EXISTS' } }),
  { phone: ['auth.validation.phoneExists'] });
assert.deepEqual(registrationServerErrors({ code: 'RESOURCE_CONFLICT' }), {});
assert.deepEqual(registrationServerErrors({ code: 'RESOURCE_CONFLICT', fieldErrors: { phone: 'untrusted message' } }), {});

const server = registrationServerErrors({ code: 'VALIDATION_ERROR', message: 'do not display this',
  fieldErrors: { password: 'do not display rejected values', email: 'INVALID', unknown: 'ignored' } });
assert.deepEqual(server, { password: ['auth.validation.passwordPolicy'] });
assert.deepEqual(registrationServerErrors({ code: 'NETWORK_ERROR', fieldErrors: { password: 'INVALID' } }), {});
assert.deepEqual(registrationServerErrors(null), {});
assert.deepEqual(registrationServerErrors({ code: 'VALIDATION_ERROR', fieldErrors: Object.create({ password: 'INVALID' }) }), {});
for (const locale of ['vi', 'en']) {
  const translate = getTranslator(locale);
  const errors = validateRegistration({ fullName: '', phone: 'bad', password: 'abc' });
  for (const key of [...Object.values(errors).flat(), ...Object.values(server).flat()]) {
    assert.notEqual(translate(key), key);
  }
  for (const key of ['auth.validation.emailExists', 'auth.validation.phoneExists', ...['title', 'length', 'uppercase', 'lowercase', 'number', 'met', 'unmet'].map(key => `auth.passwordChecklist.${key}`)]) {
    assert.notEqual(translate(key), key);
  }
}
