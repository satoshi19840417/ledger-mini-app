export function convertAmount(amount, unit) {
  return unit === 'man' ? amount / 10000 : amount;
}

export function formatAmount(amount, unit) {
  const value = convertAmount(amount, unit);
  if (unit === 'man') {
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 万円`;
  }
  return `${value.toLocaleString()} 円`;
}

export default { convertAmount, formatAmount };
