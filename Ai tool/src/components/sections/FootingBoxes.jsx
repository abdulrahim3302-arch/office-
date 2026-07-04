import { useState } from 'react';
import { useApp, uid } from '../../context/AppContext.jsx';
import { calcFootingBox, getKgPerM } from '../../utils/calculations.js';
import { FOOTING_TYPES } from '../../utils/constants.js';
import { Modal } from '../ui/Modal.jsx';
import { BarSpecInput } from '../ui/BarSpecInput.jsx';
import { SteelBreakdown } from '../ui/SteelBreakdown.jsx';
import { EditParam } from '../ui/EditParam.jsx';
import { SaveButton } from '../ui/SaveButton.jsx';

const EMPTY_MEMBER = {
  name: '', length: 1800, width: 1600, depth: 400, type: 'isolated',
  bottomAlongL: { dia: 'Y16', spacing: 200 },
  bottomAlongW: { dia: 'Y16', spacing: 200 },
  topAlongL: null, topAlongW: null, quantity: 1,
};

function FootingForm({ initial, onSave, onClose }) {
  const [m, setM] = useState({ ...EMPTY_MEMBER, ...initial });
  const isIsolated = m.type === 'isolated';
  const hasExistingTop = !!(m.topAlongL || m.topAlongW);
  const [showTop, setShowTop] = useState(hasExistingTop || !isIsolated);
  const set = (k, v) => setM((prev) => ({ ...prev, [k]: v }));

  function handleTypeChange(val) {
    set('type', val);
    if (val !== 'isolated') setShowTop(true);
  }

  function toggleTop(val) {
    setShowTop(val);
    if (!val) setM((p) => ({ ...p, topAlongL: null, topAlongW: null }));
    else setM((p) => ({
      ...p,
      topAlongL: p.topAlongL || { dia: 'Y16', spacing: 200 },
      topAlongW: p.topAlongW || { dia: 'Y16', spacing: 200 },
    }));
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(m); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name *</label>
          <input required className="input-dark text-sm" placeholder="F1" value={m.name}
            onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-dark text-sm" value={m.type} onChange={(e) => handleTypeChange(e.target.value)}>
            {FOOTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Length A (mm)</label>
          <input type="number" required className="input-dark text-sm" value={m.length}
            min="200" max="10000" step="50" onChange={(e) => set('length', +e.target.value)} />
        </div>
        <div>
          <label className="label">Width B (mm)</label>
          <input type="number" required className="input-dark text-sm" value={m.width}
            min="200" max="10000" step="50" onChange={(e) => set('width', +e.target.value)} />
        </div>
        <div>
          <label className="label">Depth D (mm)</label>
          <input type="number" required className="input-dark text-sm" value={m.depth}
            min="200" max="3000" step="50" onChange={(e) => set('depth', +e.target.value)} />
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4 space-y-3">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Bottom Reinforcement</p>
        <div className="grid grid-cols-2 gap-3">
          <BarSpecInput
            label="Along L — long way (B1 outer U-bar)"
            value={m.bottomAlongL}
            onChange={(v) => set('bottomAlongL', v)}
            required
          />
          <BarSpecInput
            label="Along W — short way (B2 inner U-bar)"
            value={m.bottomAlongW}
            onChange={(v) => set('bottomAlongW', v)}
            required
          />
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Top Reinforcement</p>
          {isIsolated && (
            <button
              type="button"
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                showTop
                  ? 'border-cyan-600 text-cyan-400 bg-cyan-900/30'
                  : 'border-gray-600 text-gray-500 hover:border-gray-500'
              }`}
              onClick={() => toggleTop(!showTop)}
            >
              {showTop ? '✓ On' : '+ Add'}
            </button>
          )}
        </div>
        {showTop && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <BarSpecInput
                label="Top Along L"
                value={m.topAlongL || {}}
                onChange={(v) => set('topAlongL', v.dia ? v : null)}
              />
              <BarSpecInput
                label="Top Along W"
                value={m.topAlongW || {}}
                onChange={(v) => set('topAlongW', v.dia ? v : null)}
              />
            </div>
            <p className="text-xs text-gray-600">Chair bars (CH1) added automatically.</p>
          </div>
        )}
      </div>

      <div>
        <label className="label">Quantity</label>
        <input type="number" required className="input-dark text-sm" value={m.quantity}
          min="0" max="500" onChange={(e) => set('quantity', +e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary flex-1">Save Footing</button>
      </div>
    </form>
  );
}

function FormulaPanel({ member, result }) {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const { details } = result;
  const cover = settings.covers.footing;
  const cover2 = cover * 2;

  const updateSettings = (path, value) => {
    const s = settings;
    let updated;
    if (path === 'cover') updated = { ...s, covers: { ...s.covers, footing: value } };
    else if (path === 'wastage') updated = { ...s, wastage: { ...s.wastage, main: value / 100 } };
    else updated = s;
    dispatch({ type: 'SET_SETTINGS', payload: updated });
  };

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-4 mt-2 text-xs font-mono space-y-2 text-gray-400">
      <p className="text-gray-200 font-bold text-sm font-sans mb-3">Calculation — {member.name}</p>

      <p>
        Cover each side = <EditParam value={cover} unit="mm" step={5}
          onChange={(v) => updateSettings('cover', v)} />
        {' '}→ 2× = {cover2}mm
      </p>
      <p>B1 leg = D − {cover2} = {member.depth} − {cover2} = <span className="text-cyan-300">{details.b1Leg}mm</span></p>

      {details.bottomAlongL && (() => {
        const d = details.bottomAlongL;
        return (
          <div className="border-l-2 border-cyan-800 pl-3 space-y-0.5">
            <p className="text-gray-300">B1 — Along L ({member.bottomAlongL?.dia} @{member.bottomAlongL?.spacing}):</p>
            <p>  Straight = A − {cover2} = {member.length} − {cover2} = {d.straight}mm</p>
            <p>  Bar = 2×{details.b1Leg} + {d.straight} = {d.barLenMm}mm → <span className="text-cyan-300">{d.barLenM}m</span></p>
            <p>  Count = ⌈(B − {cover2}) / {member.bottomAlongL?.spacing}⌉ = ⌈({member.width}−{cover2})/{member.bottomAlongL?.spacing}⌉ = <span className="text-cyan-300">{d.count} bars</span></p>
            <p>  Wt = {d.count}×{d.barLenM}×{d.kgm.toFixed(3)} × {member.quantity}no × <EditParam value={Math.round(settings.wastage.main*100)} unit="% wst" step={1} onChange={(v) => updateSettings('wastage', v)} /> = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.bottomAlongW && (() => {
        const d = details.bottomAlongW;
        const diaB1mm = member.bottomAlongL?.dia ? member.bottomAlongL.dia.replace(/\D/g, '') : 0;
        return (
          <div className="border-l-2 border-cyan-700 pl-3 space-y-0.5">
            <p className="text-gray-300">B2 — Along W ({member.bottomAlongW?.dia} @{member.bottomAlongW?.spacing}):</p>
            <p>  B2 leg = B1 − ø{diaB1mm} = {details.b1Leg} − {diaB1mm} = {d.b2Leg}mm</p>
            <p>  Straight = B − {cover2} = {member.width} − {cover2} = {d.straight}mm</p>
            <p>  Bar = 2×{d.b2Leg} + {d.straight} = {d.barLenMm}mm → <span className="text-cyan-300">{d.barLenM}m</span></p>
            <p>  Count = ⌈(A − {cover2}) / {member.bottomAlongW?.spacing}⌉ = ⌈({member.length}−{cover2})/{member.bottomAlongW?.spacing}⌉ = <span className="text-cyan-300">{d.count} bars</span></p>
            <p>  Wt = {d.count}×{d.barLenM}×{d.kgm.toFixed(3)} × {member.quantity}no = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.topAlongL && (() => {
        const d = details.topAlongL;
        return (
          <div className="border-l-2 border-blue-700 pl-3 space-y-0.5">
            <p className="text-gray-300">T1 — Top Along L ({member.topAlongL?.dia} @{member.topAlongL?.spacing}):</p>
            <p>  Straight = A − {cover2} = {member.length} − {cover2} = {d.straight}mm</p>
            <p>  Bar = 2×{d.b1Leg} + {d.straight} = {d.barLenMm}mm → <span className="text-cyan-300">{d.barLenM}m</span></p>
            <p>  Count = ⌈(B − {cover2}) / {member.topAlongL?.spacing}⌉ = <span className="text-cyan-300">{d.count} bars</span></p>
            <p>  Wt = {d.count}×{d.barLenM}×{d.kgm.toFixed(3)} × {member.quantity}no = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.topAlongW && (() => {
        const d = details.topAlongW;
        return (
          <div className="border-l-2 border-blue-600 pl-3 space-y-0.5">
            <p className="text-gray-300">T2 — Top Along W ({member.topAlongW?.dia} @{member.topAlongW?.spacing}):</p>
            <p>  B2 leg = {d.b2Leg}mm</p>
            <p>  Straight = B − {cover2} = {member.width} − {cover2} = {d.straight}mm</p>
            <p>  Bar = 2×{d.b2Leg} + {d.straight} = {d.barLenMm}mm → <span className="text-cyan-300">{d.barLenM}m</span></p>
            <p>  Count = ⌈(A − {cover2}) / {member.topAlongW?.spacing}⌉ = <span className="text-cyan-300">{d.count} bars</span></p>
            <p>  Wt = {d.count}×{d.barLenM}×{d.kgm.toFixed(3)} × {member.quantity}no = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.chairs && (() => {
        const d = details.chairs;
        return (
          <div className="border-l-2 border-amber-800 pl-3 space-y-0.5">
            <p className="text-gray-300">CH1 Chair Bars ({d.chairDia})</p>
            <p>  Max dim = {Math.max(member.length, member.width)}mm → {d.chairQty} chairs × {d.chairLen}m = <span className="text-amber-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.fb1 && (
        <div className="border-l-2 border-gray-600 pl-3 space-y-0.5">
          <p className="text-gray-300">FB1 T10 support bars (2/footing)</p>
          <p>  L = {details.fb1.fb1Len.toFixed(3)}m → Wt = <span className="text-gray-300 font-bold">{details.fb1.fb1Weight.toFixed(2)} kg</span></p>
        </div>
      )}

      <p className="text-amber-300 pt-1">
        Concrete = {member.length/1000}×{member.width/1000}×{member.depth/1000} × {member.quantity}no = {result.concrete.toFixed(3)} m³
      </p>
    </div>
  );
}

export function FootingBoxes() {
  const { state, dispatch } = useApp();
  const { sections, settings } = state;
  const members = sections.footingBoxes.members;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFormulas, setShowFormulas] = useState({});

  function saveMember(m) {
    const data = { ...m, id: m.id || uid() };
    dispatch({ type: editing ? 'UPDATE_FOOTING' : 'ADD_FOOTING', payload: data });
    setShowModal(false);
    setEditing(null);
  }

  function updateQty(id, qty) {
    const member = members.find((m) => m.id === id);
    if (member) dispatch({ type: 'UPDATE_FOOTING', payload: { ...member, quantity: qty } });
  }

  const sectionTotals = members.reduce((acc, m) => {
    const { steel, concrete } = calcFootingBox(m, settings);
    for (const [k, v] of Object.entries(steel)) acc.steel[k] = (acc.steel[k] || 0) + v;
    acc.concrete += concrete;
    return acc;
  }, { steel: {}, concrete: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Footing Boxes</h2>
          <p className="text-xs text-gray-500 mt-0.5">Isolated, combined, eccentric and lift footings. U-bar reinforcement — schedule format inputs only.</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveButton />
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add Footing</button>
        </div>
      </div>

      {members.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          <p className="text-4xl mb-3">⬛</p>
          <p>No footings added yet.</p>
          <p className="text-sm mt-1">Click <strong>+ Add Footing</strong> to get started.</p>
        </div>
      )}

      {members.map((member) => {
        const result = calcFootingBox(member, settings);
        const showF = showFormulas[member.id];

        return (
          <div key={member.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge bg-cyan-900/50 text-cyan-300">{member.name}</span>
                <span className="text-xs text-gray-400 font-medium capitalize">{member.type}</span>
                <span className="text-xs text-gray-500">{member.length}×{member.width}×{member.depth}mm</span>
                <span className="text-xs text-gray-600">
                  L:{member.bottomAlongL?.dia}@{member.bottomAlongL?.spacing} / W:{member.bottomAlongW?.dia}@{member.bottomAlongW?.spacing}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 font-semibold">Qty:</label>
                  <div className="flex items-center">
                    <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-l-lg text-sm font-bold transition-colors"
                      onClick={() => updateQty(member.id, Math.max(0, (member.quantity || 0) - 1))}>−</button>
                    <input
                      type="number"
                      className="bg-gray-900 border-y border-gray-600 text-gray-100 text-center w-16 py-1 text-sm focus:outline-none"
                      value={member.quantity || 0}
                      min="0"
                      onChange={(e) => updateQty(member.id, +e.target.value)}
                    />
                    <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-r-lg text-sm font-bold transition-colors"
                      onClick={() => updateQty(member.id, (member.quantity || 0) + 1)}>+</button>
                  </div>
                </div>
                <button className="btn-ghost text-xs py-1 px-2" onClick={() => { setEditing(member); setShowModal(true); }}>Edit</button>
                <button className="btn-danger text-xs py-1 px-2" onClick={() => dispatch({ type: 'DELETE_FOOTING', payload: member.id })}>✕</button>
              </div>
            </div>

            <div className="bg-gray-900/60 rounded-lg p-3">
              <SteelBreakdown steel={result.steel} concrete={result.concrete} compact />
            </div>

            <button
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              onClick={() => setShowFormulas((prev) => ({ ...prev, [member.id]: !prev[member.id] }))}
            >
              {showF ? '▲ Hide Formulas' : '▼ Show Formulas'} <span className="text-gray-700">(click cyan values to edit)</span>
            </button>

            {showF && <FormulaPanel member={member} result={result} />}
          </div>
        );
      })}

      {members.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900/20 to-gray-800 border border-emerald-800/40 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">Section Total — Footing Boxes</p>
          <SteelBreakdown steel={sectionTotals.steel} concrete={sectionTotals.concrete} />
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Footing' : 'Add Footing'} onClose={() => { setShowModal(false); setEditing(null); }} wide>
          <FootingForm initial={editing || {}} onSave={saveMember} onClose={() => { setShowModal(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}
