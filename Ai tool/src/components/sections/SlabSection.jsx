import { useState } from 'react';
import { useApp, uid } from '../../context/AppContext.jsx';
import { calcSlab } from '../../utils/calculations.js';
import { SLAB_TYPES, BAR_TYPES } from '../../utils/constants.js';
import { Modal } from '../ui/Modal.jsx';
import { SteelBreakdown } from '../ui/SteelBreakdown.jsx';

const EMPTY = {
  name: '', area: 0, thickness: 200, type: 'structural',
  layer1: null, layer2: null,
};

function SlabForm({ initial, onSave, onClose, defaultLayers }) {
  const [m, setM] = useState(() => ({
    ...EMPTY,
    layer1: defaultLayers.layer1,
    layer2: defaultLayers.layer2,
    ...initial,
  }));
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));
  const setL1 = (k, v) => setM((p) => ({ ...p, layer1: { ...p.layer1, [k]: v } }));
  const setL2 = (k, v) => setM((p) => ({ ...p, layer2: { ...p.layer2, [k]: v } }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(m); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name *</label>
          <input required className="input-dark text-sm" placeholder="GF Slab" value={m.name}
            onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-dark text-sm" value={m.type} onChange={(e) => set('type', e.target.value)}>
            {SLAB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Thickness (mm)</label>
        <input type="number" className="input-dark text-sm" value={m.thickness}
          min="100" max="500" step="25" onChange={(e) => set('thickness', +e.target.value)} />
      </div>

      {m.type === 'structural' && m.layer1 && m.layer2 && (
        <div className="border-t border-gray-700 pt-3 space-y-3">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Reinforcement — from schedule</p>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">1st Layer (full area, both ways)</p>
            <div className="flex gap-2">
              <select className="input-dark text-sm flex-1" value={m.layer1.dia}
                onChange={(e) => setL1('dia', e.target.value)}>
                {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="relative flex-1">
                <input type="number" className="input-dark text-sm pr-12" value={m.layer1.spacing}
                  min="100" max="400" step="25" onChange={(e) => setL1('spacing', +e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">mm c/c</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">2nd Layer (partial area, both ways)</p>
            <div className="flex gap-2 mb-2">
              <select className="input-dark text-sm flex-1" value={m.layer2.dia}
                onChange={(e) => setL2('dia', e.target.value)}>
                {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="relative flex-1">
                <input type="number" className="input-dark text-sm pr-12" value={m.layer2.spacing}
                  min="100" max="400" step="25" onChange={(e) => setL2('spacing', +e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">mm c/c</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Coverage of slab area:</label>
              <input type="number" className="input-dark text-sm w-20" value={m.layer2.coverage ?? 0.5}
                min="0.1" max="1" step="0.1" onChange={(e) => setL2('coverage', +e.target.value)} />
              <span className="text-xs text-gray-500">(0.5 = 50%)</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label">Area (m²)</label>
        <input type="number" className="input-dark text-sm" value={m.area}
          min="0" step="1" onChange={(e) => set('area', +e.target.value)} />
        <p className="text-xs text-gray-600 mt-1">Enter from your quantity take-off</p>
      </div>

      {m.type === 'grade' && (
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-400">
          Grade slab: concrete volume only. BRC mesh or steel noted separately.
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary flex-1">Save Slab</button>
      </div>
    </form>
  );
}

export function SlabSection() {
  const { state, dispatch } = useApp();
  const { sections, settings } = state;
  const members = sections.slabs.members;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFormulas, setShowFormulas] = useState({});

  const defaultLayers = {
    layer1: settings.slabSpec.layer1,
    layer2: settings.slabSpec.layer2,
  };

  function saveMember(m) {
    const data = { ...m, id: m.id || uid() };
    dispatch({ type: editing ? 'UPDATE_SLAB' : 'ADD_SLAB', payload: data });
    setShowModal(false); setEditing(null);
  }

  function updateArea(id, area) {
    const m = members.find((m) => m.id === id);
    if (m) dispatch({ type: 'UPDATE_SLAB', payload: { ...m, area: +area } });
  }

  const totals = members.reduce((acc, m) => {
    const { steel, concrete } = calcSlab(m, settings);
    for (const [k, v] of Object.entries(steel)) acc.steel[k] = (acc.steel[k] || 0) + v;
    acc.concrete += concrete;
    return acc;
  }, { steel: {}, concrete: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Slabs</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Structural: 2-layer steel (per-slab schedule). Grade slab: concrete only.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add Slab</button>
      </div>

      {members.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          <p className="text-4xl mb-3">▩</p>
          <p>No slabs added yet.</p>
        </div>
      )}

      {members.map((member) => {
        const result = calcSlab(member, settings);
        const showF = showFormulas[member.id];
        const layer1 = member.layer1 || settings.slabSpec.layer1;
        const layer2 = member.layer2 || settings.slabSpec.layer2;

        return (
          <div key={member.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge bg-amber-900/50 text-amber-300">{member.name}</span>
                <span className="text-xs text-gray-500 capitalize">{member.type}</span>
                <span className="text-xs text-gray-600">t={member.thickness}mm</span>
                {member.type === 'structural' && (
                  <span className="text-xs text-gray-600">
                    L1:{layer1.dia}@{layer1.spacing} / L2:{layer2.dia}@{layer2.spacing}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 font-semibold">Area m²:</label>
                  <input
                    type="number"
                    className="bg-gray-900 border border-gray-600 rounded-lg text-gray-100 text-center w-24 py-1.5 px-2 text-sm focus:outline-none focus:border-cyan-500"
                    value={member.area || 0}
                    min="0" step="1"
                    onChange={(e) => updateArea(member.id, e.target.value)}
                  />
                </div>
                <button className="btn-ghost text-xs py-1 px-2" onClick={() => { setEditing(member); setShowModal(true); }}>Edit</button>
                <button className="btn-danger text-xs py-1 px-2"
                  onClick={() => dispatch({ type: 'DELETE_SLAB', payload: member.id })}>✕</button>
              </div>
            </div>

            <div className="bg-gray-900/60 rounded-lg p-3">
              {member.type === 'grade'
                ? <span className="text-xs text-gray-400">Grade slab — <span className="concrete-val">{result.concrete.toFixed(3)} m³</span> concrete only</span>
                : <SteelBreakdown steel={result.steel} concrete={result.concrete} compact />
              }
            </div>

            {member.type === 'structural' && (
              <>
                <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  onClick={() => setShowFormulas((p) => ({ ...p, [member.id]: !p[member.id] }))}>
                  {showF ? '▲ Hide Formulas' : '▼ Show Formulas'}
                </button>

                {showF && result.details && (
                  <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-4 text-xs font-mono space-y-2 text-gray-400">
                    <p className="text-gray-200 font-bold text-sm font-sans">Calculation — {member.name}</p>
                    {result.details.layer1 && (() => {
                      const d = result.details.layer1;
                      return (
                        <div className="border-l-2 border-cyan-800 pl-3 space-y-0.5">
                          <p>Layer 1 ({layer1.dia} @{layer1.spacing}mm both ways, full area {member.area} m²):</p>
                          <p>  Bars/m = 1000/{layer1.spacing} = {d.barsPerM.toFixed(2)}</p>
                          <p>  Total RM = {member.area} × {d.barsPerM.toFixed(2)} × 2 ways = {d.totalRM.toFixed(1)} m</p>
                          <p>  Wt = {d.totalRM.toFixed(1)} × {d.kgm.toFixed(3)} × {(1+settings.wastage.main).toFixed(2)} = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
                        </div>
                      );
                    })()}
                    {result.details.layer2 && (() => {
                      const d = result.details.layer2;
                      const cov = layer2.coverage ?? 0.5;
                      return (
                        <div className="border-l-2 border-blue-800 pl-3 space-y-0.5">
                          <p>Layer 2 ({layer2.dia} @{layer2.spacing}mm, {cov*100}% area):</p>
                          <p>  Partial area = {member.area} × {cov} = {d.halfArea.toFixed(1)} m²</p>
                          <p>  Bars/m = 1000/{layer2.spacing} = {d.barsPerM.toFixed(2)}</p>
                          <p>  Total RM = {d.halfArea.toFixed(1)} × {d.barsPerM.toFixed(2)} × 2 = {d.totalRM.toFixed(1)} m</p>
                          <p>  Wt = {d.totalRM.toFixed(1)} × {d.kgm.toFixed(3)} × {(1+settings.wastage.main).toFixed(2)} = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
                        </div>
                      );
                    })()}
                    <p className="text-amber-300">Concrete = {member.area} × {member.thickness/1000} = {result.concrete.toFixed(3)} m³</p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {members.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900/20 to-gray-800 border border-emerald-800/40 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">Section Total — Slabs</p>
          <SteelBreakdown steel={totals.steel} concrete={totals.concrete} />
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Slab' : 'Add Slab'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <SlabForm
            initial={editing || {}}
            onSave={saveMember}
            onClose={() => { setShowModal(false); setEditing(null); }}
            defaultLayers={defaultLayers}
          />
        </Modal>
      )}
    </div>
  );
}
