import fs from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/migrate-card-payment-flag.js <data-file.json>');
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(file, 'utf8');
} catch (err) {
  console.error('Failed to read file:', err.message);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error('Invalid JSON:', err.message);
  process.exit(1);
}

const txs = Array.isArray(data) ? data : data.transactions || [];
let updatedCount = 0;
const updated = txs.map(tx => {
  if (tx.category === 'カード支払い' && !tx.isCardPayment) {
    updatedCount++;
    return { ...tx, isCardPayment: true };
  }
  return tx;
});

if (Array.isArray(data)) {
  fs.writeFileSync(file, JSON.stringify(updated, null, 2));
} else {
  const result = { ...data, transactions: updated };
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
}

console.log(`Updated ${updatedCount} transactions`);
