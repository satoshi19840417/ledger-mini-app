/**
 * @typedef {Object} Transaction
 * @property {string} date - ISO 8601 date string of the transaction.
 * @property {string} [description] - Short description of the transaction.
 * @property {string} [detail] - Additional details such as payee or store name.
 * @property {string} [memo] - Optional memo or note.
 * @property {number} amount - Amount of the transaction. Negative for expenses.
 * @property {'income'|'expense'} kind - Transaction kind.
 * @property {string} [category] - Category assigned to the transaction.
 */

/**
 * @typedef {Object} Rule
 * @property {string} [pattern] - Simple pattern string to search in descriptions.
 * @property {string} [regex] - Regular expression string for advanced matching.
 * @property {string} [flags] - Flags for the regular expression.
 * @property {string} [keyword] - Keyword used for matching when pattern/regex is absent.
 * @property {'contains'|'regex'} [mode] - Matching mode: substring or regular expression.
 * @property {'description'|'detail'|'memo'} [target] - Transaction field to evaluate.
 * @property {'expense'|'income'|'both'} [kind] - Transaction kind this rule applies to.
 * @property {string} category - Category to apply when rule matches.
 */

/**
 * @typedef {Object} StoreState
 * @property {Transaction[]} transactions - Imported transactions after applying rules.
 * @property {Rule[]} rules - Reclassification rules defined by the user.
 * @property {string|null} lastImportAt - ISO string for last import timestamp.
 */

/**
 * @typedef {{ type: 'loadFromStorage' }} LoadFromStorageAction
 */

/**
 * @typedef {{
 *   type: 'importTransactions';
 *   payload?: Transaction[];
 *   append?: boolean;
 * }} ImportTransactionsAction
 */

/**
 * @typedef {{ type: 'setRules', payload?: Rule[] }} SetRulesAction
 */

/**
 * @typedef {{ type: 'applyRules' }} ApplyRulesAction
 */

/**
 * @typedef {{ type: 'clearAll' }} ClearAllAction
 */

/**
 * @typedef {(
 *   | LoadFromStorageAction
 *   | ImportTransactionsAction
 *   | SetRulesAction
 *   | ApplyRulesAction
 *   | ClearAllAction
 * )} StoreAction
 */

export {};
