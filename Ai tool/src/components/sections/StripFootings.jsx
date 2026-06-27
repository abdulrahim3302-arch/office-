import { useState } from 'react';
import { useApp, uid } from '../../context/AppContext.jsx';
import { calcStripFooting } from '../../utils/calculations.js';
import { Modal } from '../ui/Modal.jsx';
import { BarSpecInput } from '../ui/BarSpecInput.jsx';
import { SteelBreakdown } from '../ui/SteelBreakdown.jsx';
import { EditParam } from '../ui/EditParam.jsx';
import { SaveButton } from '../ui/SaveButton.jsx';

const EMPTY = {
  name: '', width: 600, depth: 400,
  bottomAlongW: { dia: 'Y16', spacing: 200 },
  bottomAlongL: { dia: 'Y12', spacing: 200 },
  topAlongW: null, topAlongL: null,
  runningMeters: 0,
};

function StripForm({ initial, onSave, onClose }) {
  const [m, setM] = useState({ ...EMPTY, ...initial });
  const needsTop = !!(m.topAlongW || m.topAlongL);
  const [showTop, setShowTop] = useState(needsTop);
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));

  function toggleTop(val) {
    setShowTop(val);
    if (!val) setM((p) => ({ ...p, topAlongW: null, topAlongL: null }));
    else setM((p) => ({
      ...p,
      topAlongW: p.topAlongW || { dia: 'Y16', spacing: 200 },
      topAlongL: p.topAlongL || { dia: 'Y12', spacing: 200 },
    }));
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(m); }} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Name *</label>
          <input required className="input-dark text-sm" placeholder="SF1"
            value={m.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Width B (mm)</label>
          <input type="number" className="input-dark text-sm" value={m.width}
            min="200" max="5000" step="50" onChange={(e) => set('width', +e.target.value)} />
        </div>
        <div>
          <label className="label">Depth D (mm)</label>
          <input type="number" className="input-dark text-sm" value={m.depth}
            min="200" max="3000" step="50" onChange={(e) => set('depth', +e.target.value)} />
        </div>
      </div>

      {/* Bottom reinforcement */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Bottom Reinforcement</p>
        <div className="grid grid-cols-2 gap-3">
          <BarSpecInput
            label="Along W — transverse U-bars"
            value={m.bottomAlongW}
            onChange={(v) => set('bottomAlongW', v)}
            required
          />
          <BarSpecInput
            label="Along L — longitudinal bars"
            value={m.bottomAlongL}
            onChange={(v) => set('bottomAlongL', v)}
            required
          />
        </div>
      </div>

      {/* Top reinforcement toggle */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Top Reinforcement</p>
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
        </div>
        {showTop && (
          <div className="grid grid-cols-2 gap-3">
            <BarSpecInput
              label="Top Along W — transverse"
              value={m.topAlongW || {}}
              onChange={(v) => set('topAlongW', v.dia ? v : null)}
            />
            <BarSpecInput
              label="Top Along L — longitudinal"
              value={m.topAlongL || {}}
              onChange={(v) => set('topAlongL', v.dia ? v : null)}
            />
          </div>
        )}
      </div>

      <div>
        <label className="label">Running Meters (m)</label>
        <input type="number" className="input-dark text-sm" value={m.runningMeters}
          min="0" step="0.5" onChange={(e) => set('runningMeters', +e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary flex-1">Save Strip Footing</button>
      </div>
    </form>
  );
}

function FormulaPanel({ member }) {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const result = calcStripFooting(member, settings);
  const { details } = result;
  const cover = settings.covers.footing;
  const cover2 = cover * 2;

  const upd = (path, value) => {
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
        Cover = <EditParam value={cover} unit="mm" step={5} onChange={(v) => upd('cover', v)} />
        {' '}→ 2× = {cover2}mm
      </p>
      <p>B1 leg = D − {cover2} = {member.depth} − {cover2} = <span className="text-cyan-300">{details.b1Leg}mm</span></p>

      {details.bottomAlongW && (() => {
        const d = details.bottomAlongW;
        return (
          <div className="border-l-2 border-cyan-800 pl-3 space-y-0.5">
            <p className="text-gray-300">Along W — transverse U-bars ({member.bottomAlongW?.dia} @{member.bottomAlongW?.spacing}):</p>
            <p>  Straight = B − {cover2} = {member.width} − {cover2} = {d.straight}mm</p>
            <p>  Bar = 2×{d.b1Leg} + {d.straight} = {d.barLenMm}mm → <span className="text-cyan-300">{d.barLenM}m</span></p>
            <p>  Count = ⌈RM×1000 / spacing⌉ = ⌈{member.runningMeters}×1000 / {member.bottomAlongW?.spacing}⌉ = <span className="text-cyan-300">{d.count} bars</span></p>
            <p>  Wt = {d.count}×{d.barLenM}×{d.kgm.toFixed(3)} × <EditParam value={Math.round(settings.wastage.main*100)} unit="% wst" step={1} onChange={(v) => upd('wastage', v)} /> = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.bottomAlongL && (() => {
        const d = details.bottomAlongL;
        return (
          <div className="border-l-2 border-cyan-700 pl-3 space-y-0.5">
            <p className="text-gray-300">Along L — longitudinal bars ({member.bottomAlongL?.dia} @{member.bottomAlongL?.spacing}):</p>
            <p>  Count = ⌈(B − {cover2}) / spacing⌉ = ⌈({member.width}−{cover2}) / {member.bottomAlongL?.spacing}⌉ = <span className="text-cyan-300">{d.count} bars</span></p>
            <p>  Length = RM = {d.RM}m</p>
            <p>  Wt = {d.count}×{d.RM}×{d.kgm.toFixed(3)} = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.topAlongW && (() => {
        const d = details.topAlongW;
        const diaB1mm = member.bottomAlongW?.dia ? member.bottomAlongW.dia.replace(/\D/g, '') : 0;
        return (
          <div className="border-l-2 border-blue-700 pl-3 space-y-0.5">
            <p className="text-gray-300">Top Along W ({member.topAlongW?.dia} @{member.topAlongW?.spacing}):</p>
            <p>  B2 leg = B1 − ø{diaB1mm} = {details.b1Leg} − {diaB1mm} = {d.b2Leg}mm</p>
            <p>  Bar = 2×{d.b2Leg} + {d.straight} = {d.barLenMm}mm → <span className="text-cyan-300">{d.barLenM}m</span></p>
            <p>  Count = {d.count} bars → Wt = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.topAlongL && (() => {
        const d = details.topAlongL;
        return (
          <div className="border-l-2 border-blue-600 pl-3 space-y-0.5">
            <p className="text-gray-300">Top Along L ({member.topAlongL?.dia} @{member.topAlongL?.spacing}):</p>
            <p>  Count = {d.count} bars × {d.RM}m → Wt = <span className="text-cyan-400 font-bold">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {details.fb1 && (
        <div className="border-l-2 border-gray-600 pl-3">
          <p className="text-gray-300">FB1 — 4×T10 support bars: <span className="text-gray-300 font-bold">{details.fb1.fb1Weight.toFixed(2)} kg</span></p>
        </div>
      )}

      <p className="text-amber-300 pt-1">
        Concrete = {member.runningMeters}×{member.width/1000}×{member.depth/1000} = {result.concrete.toFixed(3)} m³
      </p>
    </div>
  );
}

export function StripFootings() {
  const { state, dispatch } = useApp();
  const { sections, settings } = state;
  const members = sections.stripFootings.members;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFormulas, setShowFormulas] = useState({});

  function saveMember(m) {
    const data = { ...m, id: m.id || uid() };
    dispatch({ type: editing ? 'UPDATE_STRIP' : 'ADD_STRIP', payload: data });
    setShowModal(false); setEditing(null);
  }

  function updateRM(id, rm) {
    const m = members.find((m) => m.id === id);
    if (m) dispatch({ type: 'UPDATE_STRIP', payload: { ...m, runningMeters: +rm } });
  }

  const totals = members.reduce((acc, m) => {
    const { steel, concrete } = calcStripFooting(m, settings);
    for (const [k, v] of Object.entries(steel)) acc.steel[k] = (acc.steel[k] || 0) + v;
    acc.concrete += concrete;
    return acc;
  }, { steel: {}, concrete: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Strip / Boundary Footings</h2>
          <p className="text-xs text-gray-500 mt-0.5">Dia + spacing inputs only — bar counts calculated from dimensions and running meters.</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveButton />
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add Strip</button>
        </div>
      </div>

      {members.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          <p className="text-4xl mb-3">▬</p>
          <p>No strip footings added yet.</p>
        </div>
      )}

      {members.map((member) => {
        const result = calcStripFooting(member, settings);
        const showF = showFormulas[member.id];
        const hasTop = member.topAlongW || member.topAlongL;

        return (
          <div key={member.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge bg-cyan-900/50 text-cyan-300">{member.name}</span>
                <span className="text-xs text-gray-500">{member.width}×{member.depth}mm</span>
                <span className="text-xs text-gray-600">
                  W:{member.bottomAlongW?.dia}@{member.bottomAlongW?.spacing} / L:{member.bottomAlongL?.dia}@{member.bottomAlongL?.spacing}
                  {hasTop && ' + top'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 font-semibold">Running m:</label>
                  <input
                    type="number"
                    className="bg-gray-900 border border-gray-600 rounded-lg text-gray-100 text-center w-24 py-1.5 px-2 text-sm focus:outline-none focus:border-cyan-500"
                    value={member.runningMeters || 0}
                    min="0" step="0.5"
                    onChange={(e) => updateRM(member.id, e.target.value)}
                  />
                </div>
                <button className="btn-ghost text-xs py-1 px-2" onClick={() => { setEditing(member); setShowModal(true); }}>Edit</button>
                <button className="btn-danger text-xs py-1 px-2"
                  onClick={() => dispatch({ type: 'DELETE_STRIP', payload: member.id })}>✕</button>
              </div>
            </div>

            <div className="bg-gray-900/60 rounded-lg p-3">
              <SteelBreakdown steel={result.steel} concrete={result.concrete} compact />
            </div>

            <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              onClick={() => setShowFormulas((p) => ({ ...p, [member.id]: !p[member.id] }))}>
              {showF ? '▲ Hide Formulas' : '▼ Show Formulas'} <span className="text-gray-700">(click cyan values to edit)</span>
            </button>

            {showF && <FormulaPanel member={member} />}
          </div>
        );
      })}

      {members.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900/20 to-gray-800 border border-emerald-800/40 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">Section Total — Strip Footings</p>
          <SteelBreakdown steel={totals.steel} concrete={totals.concrete} />
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Strip Footing' : 'Add Strip Footing'} onClose={() => { setShowModal(false); setEditing(null); }} wide>
          <StripForm initial={editing || {}} onSave={saveMember} onClose={() => { setShowModal(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}
