import './SegmentControl.css';

/**
 * セグメントコントロールコンポーネント
 * @param {Object} props
 * @param {Array} props.options - 選択肢の配列 [{value, label, icon?}]
 * @param {string} props.value - 現在の値
 * @param {Function} props.onChange - 値変更ハンドラー
 * @param {string} props.size - サイズ（sm, md, lg）
 * @param {boolean} props.fullWidth - 全幅表示
 * @param {boolean} props.disabled - 無効状態
 */
export default function SegmentControl({ 
  options = [], 
  value, 
  onChange,
  size = 'md',
  fullWidth = false,
  disabled = false
}) {
  return (
    <div 
      className={`segment-control ${size} ${fullWidth ? 'full-width' : ''}`}
      role="tablist"
    >
      {options.map(option => (
        <button
          key={option.value}
          className={`segment-option ${value === option.value ? 'active' : ''}`}
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          role="tab"
          aria-selected={value === option.value}
          aria-label={option.label}
        >
          {option.icon && <span className="segment-icon">{option.icon}</span>}
          <span className="segment-label">{option.label}</span>
        </button>
      ))}
      <div 
        className="segment-indicator"
        style={{
          transform: `translateX(${options.findIndex(o => o.value === value) * 100}%)`,
          width: `${100 / options.length}%`
        }}
      />
    </div>
  );
}