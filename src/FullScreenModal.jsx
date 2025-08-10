import { useEffect, useRef } from 'react';

/**
 * Full screen modal component used on mobile.
 * - Focus is trapped within the modal
 * - ESC key and clicking the overlay closes it
 */
export default function FullScreenModal({ open, onClose, title, children, primaryAction, secondaryAction }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const focusable = node.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        if (focusable.length === 0) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKey);
    // focus first element on open
    first && first.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <h2 style={{ padding: '16px 16px 0' }}>{title}</h2>}
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  );
}
