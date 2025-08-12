import assert from 'assert';
import { convertAmount, formatAmount } from './currency.js';

assert.strictEqual(convertAmount(20000, 'yen'), 20000);
assert.strictEqual(convertAmount(20000, 'man'), 2);

assert.strictEqual(formatAmount(20000, 'yen'), '20,000 円');
assert.strictEqual(formatAmount(20000, 'man'), '2.0 万円');

console.log('currency utils ok');
