import { openDB } from 'idb';

const DB_NAME = 'ledger-backup';
const DB_VERSION = 1;
const STORES = ['transactions', 'rules', 'categories'];

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name);
        }
      });
    },
  });
}

export async function saveBackup({ transactions, rules, categories }) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES, 'readwrite');
    await Promise.all([
      transactions ? tx.objectStore('transactions').put(transactions, 'all') : Promise.resolve(),
      rules ? tx.objectStore('rules').put(rules, 'all') : Promise.resolve(),
      categories ? tx.objectStore('categories').put(categories, 'all') : Promise.resolve(),
    ]);
    await tx.done;
  } catch (error) {
    console.error('Failed to save backup', error);
  }
}

export async function loadBackup() {
  try {
    const db = await getDB();
    const [transactions, rules, categories] = await Promise.all([
      db.get('transactions', 'all'),
      db.get('rules', 'all'),
      db.get('categories', 'all'),
    ]);
    return {
      transactions: transactions || [],
      rules: rules || [],
      categories: categories || null,
    };
  } catch (error) {
    console.error('Failed to load backup', error);
    return { transactions: [], rules: [], categories: null };
  }
}

