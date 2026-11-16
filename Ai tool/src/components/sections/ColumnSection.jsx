import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useApp, uid } from '../../context/AppContext.jsx';
import { calcColumn } from '../../utils/calculations.js';
import { Modal } from '../ui/Modal.jsx';
import { BarCountInput, StirrupInput } from '../ui/BarSpecInput.jsx';
import { SteelBreakdown } from '../ui/SteelBreakdown.jsx';
import { EditParam } from '../ui/EditParam.jsx';
import { SaveButton } from '../ui/SaveButton.jsx';
import { COLUMN_FLOORS_2, COLUMN_FLOORS_3 } from '../../utils/constants.js';

const EMPTY_COL = {
  name: '', width: 300, depth: 300,
  vertBars: { count: 8, dia: 'T25' },
  stirrups: { dia: 'Y8', spacing: 150, rings: 1 },
  quantity: 0,
};

function ColForm({ initial, onSave, onClose }) {
  const [m, setM] = useState({ ...EMPTY_COL, ...initial });
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(m); }} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Name *</label>
          <input required className="input-dark text-sm" placeholder="C1" value={m.name}
            onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Width B (mm)</label>
          <input type="number" className="input-dark text-sm" value={m.width}
            min="150" max="2000" step="25" onChange={(e) => set('width', +e.target.value)} />
        </div>
        <div>
          <label className="label">Depth D (mm)</label>
          <input type="number" className="input-dark text-sm" value={m.depth}
            min="150" max="2000" step="25" onChange={(e) => set('depth', +e.target.value)} />
        </div>
      </div>

      <div className="border-t border-gray-700 pt-3 space-y-3">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Reinforcement</p>
        <BarCountInput label="Vertical bars (N × Dia)" value={m.vertBars} onChange={(v) => set('vertBars', v)} />
        <StirrupInput label="Links / Stirrups" value={m.stirrups} onChange={(v) => set('stirrups', v)} />
      </div>

      <div>
        <label className="label">Quantity (this floor)</label>
        <input type="number" className="input-dark text-sm" value={m.quantity} min="0"
          onChange={(e) => set('quantity', +e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary flex-1">Save Column</button>
      </div>
    </form>
  );
}

function FormulaPanel({ member, floorId }) {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const floorData = state.sections.columns.floorData[floorId];
  const { height, lap, hasConcrete } = floorData;
  const result = calcColumn(member, height, lap, hasConcrete, settings);
  const cover2 = settings.covers.column * 2;
  const { details } = result;

  const upd = (path, value) => {
    const s = settings;
    let updated;
    if (path === 'cover') updated = { ...s, covers: { ...s.covers, column: value } };
    else if (path === 'hook') updated = { ...s, hookAllowance: value };
    else if (path === 'wastageMain') updated = { ...s, wastage: { ...s.wastage, main: value / 100 } };
    else if (path === 'wastageStir') updated = { ...s, wastage: { ...s.wastage, stirrup: value / 100 } };
    else updated = s;
    dispatch({ type: 'SET_SETTINGS', payload: updated });
  };

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-4 mt-2 text-xs font-mono space-y-2 text-gray-400">
      <p className="text-gray-200 font-bold text-sm font-sans mb-3">Calculation — {member.name} ({floorData.name})</p>
      <p>Cover = <EditParam value={settings.covers.column} unit="mm" step={5} onChange={(v) => upd('cover', v)} /> → 2× = {cover2}mm</p>
      <p>Floor height = {height}m, Lap = {lap}m → Steel height = <span className="text-cyan-300">{(+height + +lap).toFixed(1)}m</span></p>

      {details.vertBars && (
        <div className="border-l-2 border-purple-800 pl-3 space-y-0.5">
          <p>Vert bars: {member.vertBars.count} × {details.vertBars.steelHeight.toFixed(1)}m × {details.vertBars.kgm.toFixed(3)} kg/m × {member.quantity}no × <EditParam value={Math.round(settings.wastage.main*100)} unit="% wst" step={1} onChange={(v) => upd('wastageMain', v)} /> = <span className="text-cyan-400">{details.vertBars.weight.toFixed(2)} kg</span></p>
        </div>
      )}

      {details.stirrups && (() => {
        const d = details.stirrups;
        return (
          <div className="border-l-2 border-gray-600 pl-3 space-y-0.5">
            <p>Link cut = 2×({member.width}−{cover2}) + 2×({member.depth}−{cover2}) + <EditParam value={settings.hookAllowance} unit="mm hook" step={10} onChange={(v) => upd('hook', v)} /> = {(d.cutLen*1000).toFixed(0)}mm = <span className="text-cyan-300">{d.cutLen.toFixed(3)}m</span></p>
            <p>No. links = ⌈height×1000 / {member.stirrups?.spacing}⌉ + 1 = {d.numStir}</p>
            <p>Links wt = {d.numStir} × {d.rings} × {member.quantity} × {d.cutLen.toFixed(3)} × {d.kgm.toFixed(3)} × <EditParam value={Math.round(settings.wastage.stirrup*100)} unit="% wst" step={1} onChange={(v) => upd('wastageStir', v)} /> = <span className="text-cyan-400">{d.weight.toFixed(2)} kg</span></p>
          </div>
        );
      })()}

      {hasConcrete
        ? <p className="text-amber-300">Concrete = {member.width/1000}×{member.depth/1000}×{height}×{member.quantity} = {result.concrete.toFixed(3)} m³</p>
        : <p className="text-gray-600">Foundation floor — no concrete volume</p>
      }
    </div>
  );
}

function FloorPanel({ floorId }) {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const floorData = state.sections.columns.floorData[floorId];
  const { members, height, lap, hasConcrete, name } = floorData;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFormulas, setShowFormulas] = useState({});

  function saveMember(m) {
    const data = { ...m, id: m.id || uid() };
    dispatch({ type: editing ? 'UPDATE_COLUMN' : 'ADD_COLUMN', payload: { floorId, member: data } });
    setShowModal(false); setEditing(null);
  }

  function updateFloor(field, value) {
    dispatch({ type: 'UPDATE_COLUMN_FLOOR', payload: { floorId, data: { [field]: +value } } });
  }

  function updateQty(id, qty) {
    const m = members.find((m) => m.id === id);
    if (m) dispatch({ type: 'UPDATE_COLUMN', payload: { floorId, member: { ...m, quantity: qty } } });
  }

  const totals = members.reduce((acc, m) => {
    const { steel, concrete } = calcColumn(m, height, lap, hasConcrete, settings);
    for (const [k, v] of Object.entries(steel)) acc.steel[k] = (acc.steel[k] || 0) + v;
    acc.concrete += concrete;
    return acc;
  }, { steel: {}, concrete: 0 });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="label">Floor Height (m)</label>
            <input type="number" className="input-dark text-sm w-28" value={height} min="0" max="20" step="0.1"
              onChange={(e) => updateFloor('height', e.target.value)} />
          </div>
          {floorId !== 'foundation' && (
            <div>
              <label className="label">Lap Length (m)</label>
              <input type="number" className="input-dark text-sm w-28" value={lap} min="0" max="3" step="0.1"
                onChange={(e) => updateFloor('lap', e.target.value)} />
            </div>
          )}
          <div className="text-xs text-gray-500 pb-2">
            {floorId === 'foundation'
              ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No lap, no concrete for foundation columns</span>
              : `Steel height = ${height}m + ${lap}m lap = ${(+height + +lap).toFixed(1)}m`}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-300">Column Types</p>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add Column</button>
      </div>

      {members.length === 0 && (
        <div className="card text-center py-8 text-gray-500">
          <p>No column types for this floor yet.</p>
        </div>
      )}

      {members.map((member) => {
        const result = calcColumn(member, height, lap, hasConcrete, settings);
        const showF = showFormulas[member.id];

        return (
          <div key={member.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge bg-purple-900/50 text-purple-300">{member.name}</span>
                <span className="text-xs text-gray-500">{member.width}×{member.depth}mm</span>
                <span className="text-xs text-gray-600">
                  {member.vertBars?.count}×{member.vertBars?.dia} | {member.stirrups?.rings}L-{member.stirrups?.dia}@{member.stirrups?.spacing}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 font-semibold">Qty:</label>
                  <div className="flex items-center">
                    <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-l-lg text-sm font-bold"
                      onClick={() => updateQty(member.id, Math.max(0, (member.quantity || 0) - 1))}>−</button>
                    <input type="number"
                      className="bg-gray-900 border-y border-gray-600 text-gray-100 text-center w-16 py-1 text-sm focus:outline-none"
                      value={member.quantity || 0} min="0"
                      onChange={(e) => updateQty(member.id, +e.target.value)} />
                    <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-r-lg text-sm font-bold"
                      onClick={() => updateQty(member.id, (member.quantity || 0) + 1)}>+</button>
                  </div>
                </div>
                <button className="btn-ghost text-xs py-1 px-2" onClick={() => { setEditing(member); setShowModal(true); }}>Edit</button>
                <button className="btn-danger text-xs py-1 px-2"
                  onClick={() => dispatch({ type: 'DELETE_COLUMN', payload: { floorId, memberId: member.id } })}><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="bg-gray-900/60 rounded-lg p-3">
              <SteelBreakdown steel={result.steel} concrete={result.concrete} compact />
            </div>

            <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              onClick={() => setShowFormulas((p) => ({ ...p, [member.id]: !p[member.id] }))}>
              {showF ? '▲ Hide Formulas' : '▼ Show Formulas'} <span className="text-gray-700">(click cyan values to edit)</span>
            </button>

            {showF && <FormulaPanel member={member} floorId={floorId} />}
          </div>
        );
      })}

      {members.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900/20 to-gray-800 border border-purple-800/40 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">Floor Total — {name}</p>
          <SteelBreakdown steel={totals.steel} concrete={totals.concrete} />
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Column' : 'Add Column'} onClose={() => { setShowModal(false); setEditing(null); }}>
          <ColForm initial={editing || {}} onSave={saveMember} onClose={() => { setShowModal(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}

export function ColumnSection() {
  const { state } = useApp();
  const storeys = state.project?.storeys || 2;
  const floors = storeys >= 3 ? COLUMN_FLOORS_3 : COLUMN_FLOORS_2;
  const [activeFloorId, setActiveFloorId] = useState('foundation');

  // If active floor is not in current floors list (e.g. storeys reduced), reset
  const activeId = floors.find(f => f.id === activeFloorId) ? activeFloorId : floors[0].id;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Columns</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {storeys}-storey building · Foundation: no lap, no concrete · Upper floors: steel = height + lap
          </p>
        </div>
        <SaveButton />
      </div>

      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 flex-wrap">
        {floors.map((floor) => (
          <button
            key={floor.id}
            className={`flex-1 min-w-max text-xs font-semibold py-2 px-3 rounded-lg transition-colors ${
              activeId === floor.id ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveFloorId(floor.id)}
          >
            {floor.label}
          </button>
        ))}
      </div>

      <FloorPanel floorId={activeId} />
    </div>
  );
}
