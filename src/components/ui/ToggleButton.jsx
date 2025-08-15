import './ToggleButton.css';

/**
 * トグルボタンコンポーネント
 * @param {Object} props
 * @param {string} props.icon - 表示するアイコン
 * @param {string} props.tooltip - ツールチップテキスト
 * @param {boolean} props.active - アクティブ状態
 * @param {Function} props.onClick - クリックハンドラー
 * @param {string} props.variant - バリアント（default, primary, success, danger）
 * @param {boolean} props.disabled - 無効状態
 * @param {string} props.size - サイズ（sm, md, lg）
 */
export default function ToggleButton({ 
  icon, 
  tooltip, 
  active = false, 
  onClick,
  variant = 'default',
  disabled = false,
  size = 'md'
}) {
  return (
    <button 
      className={`toggle-button ${variant} ${size} ${active ? 'active' : ''}`}
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
      aria-pressed={active}
      aria-label={tooltip}
    >
      <span className="toggle-icon">{icon}</span>
      <span className="toggle-tooltip">{tooltip}</span>
    </button>
  );
}