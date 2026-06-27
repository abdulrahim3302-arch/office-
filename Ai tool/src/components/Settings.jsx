import { useApp } from '../context/AppContext.jsx';
import { BAR_TYPES, DEFAULT_SETTINGS } from '../utils/constants.js';

export function Settings({ onClose }) {
  const { state, dispatch } = useApp();
  const s = state.settings;

  function updateCover(field, val) {
    dispatch({ type: 'SET_SETTINGS', payload: { ...s, covers: { ...s.covers, [field]: +val } } });
  }
  function updateWastage(field, val) {
    dispatch({ type: 'SET_SETTINGS', payload: { ...s, wastage: { ...s.wastage, [field]: +val / 100 } } });
  }
  function updateKgPerM(bar, val) {
    dispatch({ type: 'SET_SETTINGS', payload: { ...s, kgPerM: { ...s.kgPerM, [bar]: +val } } });
  }
  function updateSlabSpec(layer, field, val) {
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        ...s,
        slabSpec: {
          ...s.slabSpec,
          [layer]: { ...s.slabSpec[layer], [field]: field === 'dia' ? val : +val },
        },
      },
    });
  }
  function reset() {
    dispatch({ type: 'SET_SETTINGS', payload: { ...DEFAULT_SETTINGS } });
  }

  const row = 'flex items-center justify-between gap-4 py-2 border-b border-gray-700/50 last:border-0';
  const numIn = 'input-dark text-sm w-24 text-right';

  return (
    <div className="space-y-6">
      {/* Cover values */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Concrete Cover (mm each side)</h3>
        <div className="card space-y-0">
          {[['footing', 'Footing Cover'], ['beam', 'Beam/Ring Beam Cover'], ['column', 'Column Cover'], ['slab', 'Slab Cover']].map(([k, label]) => (
            <div key={k} className={row}>
              <span className="text-sm text-gray-300">{label}</span>
              <input type="number" className={numIn} value={s.covers[k]} min="20" max="150" onChange={(e) => updateCover(k, e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      {/* Wastage */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Wastage (%)</h3>
        <div className="card space-y-0">
          <div className={row}>
            <span className="text-sm text-gray-300">Main bars (including laps)</span>
            <input type="number" className={numIn} value={+(s.wastage.main * 100).toFixed(0)} min="0" max="30" onChange={(e) => updateWastage('main', e.target.value)} />
          </div>
          <div className={row}>
            <span className="text-sm text-gray-300">Stirrups</span>
            <input type="number" className={numIn} value={+(s.wastage.stirrup * 100).toFixed(0)} min="0" max="30" onChange={(e) => updateWastage('stirrup', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Other settings */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Other</h3>
        <div className="card space-y-0">
          <div className={row}>
            <span className="text-sm text-gray-300">Lap length (m)</span>
            <input type="number" className={numIn} value={s.lapLength} min="0" max="3" step="0.1"
              onChange={(e) => dispatch({ type: 'SET_SETTINGS', payload: { ...s, lapLength: +e.target.value } })} />
          </div>
          <div className={row}>
            <span className="text-sm text-gray-300">Standard bar length (m)</span>
            <input type="number" className={numIn} value={s.barLength} min="6" max="18"
              onChange={(e) => dispatch({ type: 'SET_SETTINGS', payload: { ...s, barLength: +e.target.value } })} />
          </div>
          <div className={row}>
            <span className="text-sm text-gray-300">Hook allowance (mm)</span>
            <input type="number" className={numIn} value={s.hookAllowance} min="80" max="300"
              onChange={(e) => dispatch({ type: 'SET_SETTINGS', payload: { ...s, hookAllowance: +e.target.value } })} />
          </div>
        </div>
      </section>

      {/* kg/m values */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Steel Weight (kg/m)</h3>
        <div className="card">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BAR_TYPES.map((bar) => (
              <div key={bar}>
                <label className="label text-cyan-400">{bar}</label>
                <input
                  type="number"
                  className="input-dark text-sm text-right"
                  value={s.kgPerM[bar]}
                  min="0.1"
                  max="20"
                  step="0.001"
                  onChange={(e) => updateKgPerM(bar, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slab spec */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Slab Reinforcement Default</h3>
        <div className="card space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-xs text-gray-500 font-bold uppercase pt-5">Layer 1 (Full area)</div>
            <div>
              <label className="label">Diameter</label>
              <select className="input-dark text-sm" value={s.slabSpec.layer1.dia} onChange={(e) => updateSlabSpec('layer1', 'dia', e.target.value)}>
                {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Spacing (mm)</label>
              <input type="number" className="input-dark text-sm" value={s.slabSpec.layer1.spacing} min="100" max="500" step="25" onChange={(e) => updateSlabSpec('layer1', 'spacing', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-xs text-gray-500 font-bold uppercase pt-5">Layer 2 (Partial)</div>
            <div>
              <label className="label">Diameter</label>
              <select className="input-dark text-sm" value={s.slabSpec.layer2.dia} onChange={(e) => updateSlabSpec('layer2', 'dia', e.target.value)}>
                {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Spacing (mm)</label>
              <input type="number" className="input-dark text-sm" value={s.slabSpec.layer2.spacing} min="100" max="500" step="25" onChange={(e) => updateSlabSpec('layer2', 'spacing', e.target.value)} />
            </div>
          </div>
          <div className={row}>
            <span className="text-sm text-gray-300">Layer 2 coverage (fraction of area)</span>
            <input type="number" className={numIn} value={s.slabSpec.layer2.coverage ?? 0.5} min="0.1" max="1" step="0.1"
              onChange={(e) => updateSlabSpec('layer2', 'coverage', e.target.value)} />
          </div>
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={reset}>Reset to Defaults</button>
        <button className="btn-primary flex-1" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
