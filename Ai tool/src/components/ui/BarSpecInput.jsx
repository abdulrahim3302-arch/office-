import { BAR_TYPES } from '../../utils/constants.js';

export function BarSpecInput({ label, value, onChange, required = false }) {
  const dia = value?.dia || '';
  const spacing = value?.spacing || '';

  return (
    <div>
      <label className="label">{label}{required && ' *'}</label>
      <div className="flex gap-2">
        <select
          className="input-dark text-sm flex-1"
          value={dia}
          onChange={(e) => onChange({ ...value, dia: e.target.value })}
        >
          <option value="">— Bar —</option>
          {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="relative flex-1">
          <input
            type="number"
            className="input-dark text-sm pr-10"
            placeholder="spacing"
            value={spacing}
            min="50"
            max="500"
            step="25"
            onChange={(e) => onChange({ ...value, spacing: +e.target.value })}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">mm</span>
        </div>
      </div>
    </div>
  );
}

export function BarCountInput({ label, value, onChange }) {
  const count = value?.count ?? '';
  const dia = value?.dia || '';

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="input-dark text-sm text-center"
          style={{ width: '58px' }}
          placeholder="4"
          value={count}
          min="0"
          onChange={(e) => onChange({ ...value, count: +e.target.value })}
          title="Number of bars"
        />
        <span className="text-gray-500 text-sm font-bold">×</span>
        <select
          className="input-dark text-sm flex-1"
          value={dia}
          onChange={(e) => onChange({ ...value, dia: e.target.value })}
        >
          <option value="">— Dia —</option>
          {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </div>
  );
}

export function StirrupInput({ label, value, onChange }) {
  const dia = value?.dia || '';
  const spacing = value?.spacing || '';
  const rings = value?.rings || 1;

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="input-dark text-sm text-center"
          style={{ width: '52px' }}
          placeholder="1"
          value={rings}
          min="1"
          max="4"
          onChange={(e) => onChange({ ...value, rings: +e.target.value })}
          title="Rings / legs"
        />
        <span className="text-gray-500 text-xs">rings</span>
        <select
          className="input-dark text-sm flex-1"
          value={dia}
          onChange={(e) => onChange({ ...value, dia: e.target.value })}
        >
          <option value="">— Bar —</option>
          {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="text-gray-500 text-xs">@</span>
        <div className="relative flex-1">
          <input
            type="number"
            className="input-dark text-sm pr-10"
            placeholder="150"
            value={spacing}
            min="50"
            max="500"
            step="25"
            onChange={(e) => onChange({ ...value, spacing: +e.target.value })}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">mm</span>
        </div>
      </div>
    </div>
  );
}
