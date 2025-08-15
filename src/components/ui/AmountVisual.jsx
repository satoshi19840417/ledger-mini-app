import { COLORS, AMOUNT_ICONS } from '../../constants';
import './AmountVisual.css';

/**
 * 視覚的な金額表示コンポーネント
 * @param {Object} props
 * @param {number} props.amount - 金額
 * @param {string} props.label - ラベル
 * @param {boolean} props.isIncome - 収入かどうか（金額が正でも明示的に指定可能）
 * @param {boolean} props.showBar - プログレスバーを表示するか
 * @param {number} props.maxAmount - プログレスバーの最大値（デフォルト: 500000）
 * @param {boolean} props.compact - コンパクト表示
 */
export default function AmountVisual({ 
  amount, 
  label, 
  isIncome = null,
  showBar = true,
  maxAmount = 500000,
  compact = false
}) {
  // isIncomeが明示的に指定されていない場合は金額の正負で判定
  const isPositive = isIncome !== null ? isIncome : amount >= 0;
  const absAmount = Math.abs(amount);
  const percentage = Math.min((absAmount / maxAmount) * 100, 100);
  const formattedAmount = absAmount.toLocaleString();
  
  const icon = isPositive ? AMOUNT_ICONS.income : AMOUNT_ICONS.expense;
  const colorClass = isPositive ? 'income' : 'expense';
  
  if (compact) {
    return (
      <div className={`amount-visual-compact ${colorClass}`}>
        <span className="amount-icon">{icon}</span>
        <span className="amount-value">¥{formattedAmount}</span>
      </div>
    );
  }
  
  return (
    <div className="amount-visual">
      {label && <div className="amount-label">{label}</div>}
      <div className="amount-content">
        <span className={`amount-icon ${colorClass}`}>
          {icon}
        </span>
        <div className="amount-bar-container">
          {showBar && (
            <div 
              className={`amount-bar ${colorClass}`}
              style={{ width: `${percentage}%` }}
              aria-valuenow={percentage}
              aria-valuemin="0"
              aria-valuemax="100"
              role="progressbar"
            />
          )}
          <span className="amount-value">¥{formattedAmount}</span>
        </div>
      </div>
    </div>
  );
}