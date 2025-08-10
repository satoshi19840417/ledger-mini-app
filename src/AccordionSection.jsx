import { useState } from 'react';

export default function AccordionSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="section">
      <h3
        onClick={() => setOpen(o => !o)}
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <span style={{ flex: 1 }}>{title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </h3>
      {open && children}
    </section>
  );
}
