import assert from 'assert';
import { normalizeDate } from './csv.js';

assert.strictEqual(normalizeDate('2023/1/5'), '2023-01-05');
assert.strictEqual(normalizeDate('2023年12月31日'), '2023-12-31');
assert.strictEqual(normalizeDate('2023-06-07'), '2023-06-07');

console.log('csv normalizeDate ok');
