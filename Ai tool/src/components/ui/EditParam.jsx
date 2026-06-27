import { useState } from 'react';

export function EditParam({ value, unit = '', step, onChange }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  const commit = () => {
    const n = parseFloat(local);
    if (!isNaN(n)) onChange(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        step={step}
        className="inline-block bg-gray-800 border-b border-cyan-500 text-cyan-200 text-xs font-mono w-14 text-center focus:outline-none"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        autoFocus
      />
    );
  }

  return (
    <span
      className="text-cyan-300 cursor-pointer underline decoration-dotted hover:text-white transition-colors"
      title="Click to edit"
      onClick={() => { setLocal(value); setEditing(true); }}
    >
      {value}{unit}
    </span>
  );
}
