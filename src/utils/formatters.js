import { formatAmount } from './currency.js';

export const formatMonth = (m) => `${m.slice(2, 4)}/${m.slice(5, 7)}`; // YY/MM
export const yFmt = (value, unit) => formatAmount(value, unit);
