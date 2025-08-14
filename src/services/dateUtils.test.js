import assert from 'assert';
import { clampFutureDate } from './dateUtils.js';

const future = new Date();
future.setDate(future.getDate() + 1);
const futureStr = future.toISOString().split('T')[0];
const todayStr = new Date().toISOString().split('T')[0];

assert.strictEqual(clampFutureDate(futureStr), todayStr);

console.log('date utils future date clamped ok');
