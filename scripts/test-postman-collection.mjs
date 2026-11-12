import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

console.log('--- RUNNING POSTMAN COLLECTION & ENVIRONMENT AUTOMATED VERIFICATION ---');

const collectionPath = path.join(process.cwd(), 'architechture', 'postman', 'Clucky-API-Gateway.postman_collection.json');
const environmentPath = path.join(process.cwd(), 'architechture', 'postman', 'Clucky-Local.postman_environment.json');
const errorsPath = path.join(process.cwd(), 'contracts', 'errors.json');

assert.ok(fs.existsSync(collectionPath), 'Collection file must exist');
assert.ok(fs.existsSync(environmentPath), 'Environment file must exist');
assert.ok(fs.existsSync(errorsPath), 'Errors contract must exist');

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));
const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf-8'));
const errorContracts = JSON.parse(fs.readFileSync(errorsPath, 'utf-8'));

// 1. Postman schema validation
assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
assert.ok(collection.info.name.includes('Clucky'));
assert.ok(Array.isArray(collection.item) && collection.item.length >= 8);

// 2. Environment check
const envKeys = new Set(environment.values.map(v => v.key));
const requiredEnvKeys = [
  'gateway_url',
  'customer_origin',
  'admin_origin',
  'customer_email',
  'customer_password',
  'admin_email',
  'admin_password',
  'manager_email',
  'manager_password',
  'staff_email',
  'staff_password',
];

for (const key of requiredEnvKeys) {
  assert.ok(envKeys.has(key), `Environment must contain key: ${key}`);
}

// Ensure no secrets/tokens are hardcoded in environment values (only placeholders)
for (const item of environment.values) {
  assert.ok(!item.value.includes('Bearer eyJ'), `Secret token found in environment key ${item.key}`);
}

// 3. Request URL and Gateway check
let totalRequests = 0;
let chainedVarCount = 0;
let negativeCount = 0;
let positiveCount = 0;

function traverse(items) {
  for (const item of items) {
    if (item.item) {
      traverse(item.item);
    } else if (item.request) {
      totalRequests++;
      const req = item.request;
      const rawUrl = req.url.raw;

      // Criteria: MUST use {{gateway_url}}, NO hardcoded business ports (:8081, :8082, etc.)
      assert.ok(rawUrl.startsWith('{{gateway_url}}'), `Request ${item.name} must start with {{gateway_url}} but got: ${rawUrl}`);
      assert.ok(!rawUrl.match(/:808[1-9]/), `Request ${item.name} contains hardcoded business port! ${rawUrl}`);

      // Criteria: Client headers and Origin
      const headers = req.header || [];
      const clientHeader = headers.find(h => h.key.toLowerCase() === 'x-clucky-client');
      assert.ok(clientHeader, `Request ${item.name} must specify X-Clucky-Client header`);

      const originHeader = headers.find(h => h.key.toLowerCase() === 'origin');
      assert.ok(originHeader, `Request ${item.name} must specify Origin header`);

      // Criteria: Assertions on status and body
      const testEvents = (item.event || []).filter(e => e.listen === 'test');
      assert.ok(testEvents.length > 0, `Request ${item.name} must have a test script`);
      const scriptBody = testEvents[0].script.exec.join('\n');

      assert.ok(scriptBody.includes('pm.response.to.have.status'), `Request ${item.name} test must assert status`);

      // Check chained variables
      if (scriptBody.includes('pm.environment.set')) {
        chainedVarCount++;
      }

      // Check expected error code against contracts/errors.json if negative
      const matchErrorCode = scriptBody.match(/pm\.expect\(json\.code\)\.to\.eql\("([A-Z_]+)"\)/);
      if (matchErrorCode) {
        negativeCount++;
        const errCode = matchErrorCode[1];
        assert.ok(errorContracts[errCode], `Error code ${errCode} must exist in contracts/errors.json`);
      } else {
        positiveCount++;
      }

      // Check no real sensitive PII or raw secrets in request body
      if (req.body && req.body.raw) {
        assert.ok(!req.body.raw.includes('eyJhbGciOi'), `JWT token found in body of ${item.name}`);
        assert.ok(!req.body.raw.includes('GOCSPX-'), `Google client secret found in body of ${item.name}`);
      }
    }
  }
}

traverse(collection.item);

console.log(`Verified ${totalRequests} total requests:`);
console.log(` - Positive cases: ${positiveCount}`);
console.log(` - Negative/Security cases: ${negativeCount}`);
console.log(` - Requests with dynamic variable chaining: ${chainedVarCount}`);

assert.ok(totalRequests >= 30, `Expected at least 30 requests, found ${totalRequests}`);
assert.ok(negativeCount >= 7, `Expected at least 7 negative/security test cases, found ${negativeCount}`);
assert.ok(chainedVarCount >= 5, `Expected at least 5 chained variable extractions, found ${chainedVarCount}`);

// 4. Safe Cleanup folder verification
const cleanupFolder = collection.item.find(i => i.name.includes('Cleanup'));
assert.ok(cleanupFolder, 'Collection must have a dedicated Safe Fixture Cleanup folder');
assert.ok(cleanupFolder.item.some(req => req.request.method === 'DELETE'), 'Cleanup folder must contain delete action');

console.log('All Postman Collection and Environment verifications PASSED successfully!');
