import { useState } from 'react';
import { X } from 'lucide-react';
import { useApp, uid } from '../../context/AppContext.jsx';
import { calcBeam } from '../../utils/calculations.js';
import { Modal } from '../ui/Modal.jsx';
import { BarCountInput } from '../ui/BarSpecInput.jsx';
import { SteelBreakdown } from '../ui/SteelBreakdown.jsx';
import { EditParam } from '../ui/EditParam.jsx';
import { SaveButton } from '../ui/SaveButton.jsx';
import { BAR_TYPES } from '../../utils/constants.js';

const EMPTY_BEAM = {
  name: '', width: 250, depth: 500,
  topBars: { count: 3, dia: 'Y16' },
  bottomBars: { count: 3, dia: 'Y16' },
  hasExtraTop: false,
  extraTopSupport: { count: 2, dia: 'Y16' },
  extraTopMidspan: { count: 0, dia: 'Y16' },
  hasExtraBottom: false,
  extraBottomSupport: { count: 2, dia: 'Y16' },
  extraBottomMidspan: { count: 0, dia: 'Y16' },
  hasWebBars: false,
  webBars: { count: 2, dia: 'Y12' },
  stirrups: { dia: 'Y8', spacing: 150, rings: 2 },
  hasMidspanStirrup: false,
  stirrupsMidspan: { spacing: 200 },
  extraBarLenOverride: null,
  runningMeters: 0,
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 text-xs font-semibold transition-colors ${checked ? 'text-cyan-300' : 'text-gray-500 hover:text-gray-400'}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`w-7 h-3.5 rounded-full relative transition-colors flex-shrink-0 ${checked ? 'bg-cyan-700' : 'bg-gray-700'}`}>
        <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      {label}
    </button>
  );
}

function SpacingInput({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>}
      <div className="relative">
        <input
          type="number"
          className="input-dark text-sm text-center pr-8"
          style={{ width: '90px' }}
          value={value || ''}
          min="50" max="500" step="25"
          onChange={(e) => onChange(+e.target.value)}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">mm</span>
      </div>
    </div>
  );
}

function BeamForm({ initial, onSave, onClose }) {
  const init = {
    ...EMPTY_BEAM,
    ...initial,
    topBars: { ...EMPTY_BEAM.topBars, ...initial.topBars },
    bottomBars: { ...EMPTY_BEAM.bottomBars, ...initial.bottomBars },
    stirrups: { ...EMPTY_BEAM.stirrups, ...initial.stirrups },
    extraTopSupport: { ...EMPTY_BEAM.extraTopSupport, ...initial.extraTopSupport },
    extraTopMidspan: { ...EMPTY_BEAM.extraTopMidspan, ...initial.extraTopMidspan },
    extraBottomSupport: { ...EMPTY_BEAM.extraBottomSupport, ...initial.extraBottomSupport },
    extraBottomMidspan: { ...EMPTY_BEAM.extraBottomMidspan, ...initial.extraBottomMidspan },
    webBars: { ...EMPTY_BEAM.webBars, ...initial.webBars },
    stirrupsMidspan: { spacing: initial.stirrupsMidspan?.spacing ?? 200 },
  };
  const [m, setM] = useState(init);
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(m); }} className="space-y-5">
      {/* Dimensions */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Name *</label>
          <input required className="input-dark text-sm" placeholder="B1"
            value={m.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Width B (mm)</label>
          <input type="number" className="input-dark text-sm" value={m.width}
            min="100" max="2000" step="25" onChange={(e) => set('width', +e.target.value)} />
        </div>
        <div>
          <label className="label">Depth D (mm)</label>
          <input type="number" className="input-dark text-sm" value={m.depth}
            min="200" max="3000" step="25" onChange={(e) => set('depth', +e.target.value)} />
        </div>
      </div>

      {/* Continuous bars */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Continuous Bars</p>
        <div className="grid grid-cols-2 gap-3">
          <BarCountInput label="Top bars (cont.)" value={m.topBars}
            onChange={(v) => set('topBars', v)} />
          <BarCountInput label="Bottom bars (cont.)" value={m.bottomBars}
            onChange={(v) => set('bottomBars', v)} />
        </div>
      </div>

      {/* Extra top bars */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <Toggle checked={m.hasExtraTop} onChange={(v) => set('hasExtraTop', v)}
          label="Extra Top Bars" />
        {m.hasExtraTop && (
          <div className="grid grid-cols-2 gap-3 pl-2">
            <BarCountInput label="@ Support (×2 zones)" value={m.extraTopSupport}
              onChange={(v) => set('extraTopSupport', v)} />
            <BarCountInput label="@ Midspan (×1 zone)" value={m.extraTopMidspan}
              onChange={(v) => set('extraTopMidspan', v)} />
          </div>
        )}
      </div>

      {/* Extra bottom bars */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <Toggle checked={m.hasExtraBottom} onChange={(v) => set('hasExtraBottom', v)}
          label="Extra Bottom Bars" />
        {m.hasExtraBottom && (
          <div className="grid grid-cols-2 gap-3 pl-2">
            <BarCountInput label="@ Support (×2 zones)" value={m.extraBottomSupport}
              onChange={(v) => set('extraBottomSupport', v)} />
            <BarCountInput label="@ Midspan (×1 zone)" value={m.extraBottomMidspan}
              onChange={(v) => set('extraBottomMidspan', v)} />
          </div>
        )}
      </div>

      {/* Web / side face bars */}
      <div className="border-t border-gray-700 pt-4 space-y-3">
        <Toggle checked={m.hasWebBars} onChange={(v) => set('hasWebBars', v)}
          label="Web / Side Face Bars" />
        {m.hasWebBars && (
          <div className="pl-2 max-w-[180px]">
            <BarCountInput label="Web bars (total count)" value={m.webBars}
              onChange={(v) => set('webBars', v)} />
          </div>
        )}
      </div>

      {/* Stirrups */}
      <div className="border-t border-gray-700 pt-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Stirrups / Links</p>

        {/* Rings + Dia — asked once for whole beam */}
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="label">Rings</label>
            <input type="number" className="input-dark text-sm text-center" style={{ width: '60px' }}
              value={m.stirrups.rings} min="1" max="4"
              onChange={(e) => set('stirrups', { ...m.stirrups, rings: +e.target.value })} />
          </div>
          <div className="flex-1 min-w-[110px]">
            <label className="label">Diameter</label>
            <select className="input-dark text-sm" value={m.stirrups.dia}
              onChange={(e) => set('stirrups', { ...m.stirrups, dia: e.target.value })}>
              {BAR_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-600 pb-2 self-end">applies to whole beam</p>
        </div>

        <div className="h-px bg-gray-700/60" />

        {/* Zone toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Spacing varies by zone?</span>
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
            <button type="button"
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${m.hasMidspanStirrup ? 'bg-cyan-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => set('hasMidspanStirrup', true)}>Yes</button>
            <button type="button"
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${!m.hasMidspanStirrup ? 'bg-gray-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => set('hasMidspanStirrup', false)}>No</button>
          </div>
        </div>

        {m.hasMidspanStirrup ? (
          <div className="space-y-3">
            <div>
              <label className="label">Support zones <span className="text-gray-600">(2× ends, each = RM÷3)</span></label>
              <SpacingInput value={m.stirrups.spacing}
                onChange={(v) => set('stirrups', { ...m.stirrups, spacing: v })} />
            </div>
            <div>
              <label className="label">Midspan zone <span className="text-gray-600">(middle third = RM÷3)</span></label>
              <SpacingInput value={m.stirrupsMidspan.spacing}
                onChange={(v) => set('stirrupsMidspan', { spacing: v })} />
            </div>
            {/* Live count preview */}
            {m.runningMeters > 0 && m.stirrups.spacing > 0 && m.stirrupsMidspan.spacing > 0 && (() => {
              const zL = m.runningMeters / 3;
              const suppPer = Math.floor((zL * 1000) / m.stirrups.spacing) + 1;
              const totalSupp = suppPer * 2;
              const mid = Math.floor((zL * 1000) / m.stirrupsMidspan.spacing) + 1;
              return (
                <p className="text-xs text-cyan-600/80 bg-cyan-950/30 border border-cyan-900/40 rounded-lg px-3 py-2">
                  → {totalSupp} support + {mid} midspan = <span className="font-bold text-cyan-400">{totalSupp + mid} total</span> × {m.stirrups.rings} rings
                </p>
              );
            })()}
          </div>
        ) : (
          <div>
            <label className="label">Spacing <span className="text-gray-600">(full beam)</span></label>
            <SpacingInput value={m.stirrups.spacing}
              onChange={(v) => set('stirrups', { ...m.stirrups, spacing: v })} />
          </div>
        )}

        {/* Zone length override — only for extra bars */}
        {(m.hasExtraTop || m.hasExtraBottom) && (
          <div className="pt-1">
            <label className="label text-gray-600">Extra bar zone length override (m) — leave blank for RM÷3</label>
            <input type="number" className="input-dark text-sm" style={{ width: '120px' }}
              placeholder="auto"
              value={m.extraBarLenOverride ?? ''}
              min="0" step="0.1"
              onChange={(e) => set('extraBarLenOverride', e.target.value === '' ? null : +e.target.value)} />
          </div>
        )}
      </div>

      {/* Running meters */}
      <div className="border-t border-gray-700 pt-4">
        <label className="label">Running Meters (m)</label>
        <input type="number" className="input-dark text-sm" value={m.runningMeters}
          min="0" step="0.5" onChange={(e) => set('runningMeters', +e.target.value)} />
        <p className="text-xs text-gray-600 mt-1">Enter from your quantity take-off</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary flex-1">Save Beam</button>
      </div>
    </form>
  );
}

function FormulaPanel({ member }) {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const result = calcBeam(member, settings);
  const cover2 = settings.covers.beam * 2;
  const { details } = result;
  const wstMain = (1 + settings.wastage.main).toFixed(2);
  const wstStir = (1 + settings.wastage.stirrup).toFixed(2);
  const RM = member.runningMeters;

  const upd = (path, value) => {
    let updated = settings;
    if (path === 'cover') updated = { ...settings, covers: { ...settings.covers, beam: value } };
    else if (path === 'hook') updated = { ...settings, hookAllowance: value };
    else if (path === 'wastageMain') updated = { ...settings, wastage: { ...settings.wastage, main: value / 100 } };
    else if (path === 'wastageStir') updated = { ...settings, wastage: { ...settings.wastage, stirrup: value / 100 } };
    dispatch({ type: 'SET_SETTINGS', payload: updated });
  };

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-4 mt-2 text-xs font-mono space-y-1.5 text-gray-400">
      <p className="text-gray-200 font-bold text-sm font-sans mb-3">Calculation — {member.name}</p>
      <p>Cover = <EditParam value={settings.covers.beam} unit="mm" step={5} onChange={(v) => upd('cover', v)} /> → 2× = {cover2}mm</p>
      <p>Wastage (main) = <EditParam value={Math.round(settings.wastage.main * 100)} unit="%" step={1} onChange={(v) => upd('wastageMain', v)} /> → ×{wstMain}</p>
      <p>Wastage (stirrup) = <EditParam value={Math.round(settings.wastage.stirrup * 100)} unit="%" step={1} onChange={(v) => upd('wastageStir', v)} /></p>

      <div className="border-t border-gray-700 pt-2 space-y-1">
        {details.contTop && (
          <p>Cont. top: {RM}m × {details.contTop.count} × {member.topBars.dia} × {details.contTop.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.contTop.weight.toFixed(2)} kg</span></p>
        )}
        {details.contBottom && (
          <p>Cont. bottom: {RM}m × {details.contBottom.count} × {member.bottomBars.dia} × {details.contBottom.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.contBottom.weight.toFixed(2)} kg</span></p>
        )}

        {details.extraTopSupport && (
          <p>Extra top @ supp: 2 occ × {details.extraTopSupport.zoneLen.toFixed(2)}m × {details.extraTopSupport.count} × {member.extraTopSupport.dia} × {details.extraTopSupport.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.extraTopSupport.weight.toFixed(2)} kg</span></p>
        )}
        {details.extraTopMidspan && (
          <p>Extra top @ mid: 1 occ × {details.extraTopMidspan.zoneLen.toFixed(2)}m × {details.extraTopMidspan.count} × {member.extraTopMidspan.dia} × {details.extraTopMidspan.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.extraTopMidspan.weight.toFixed(2)} kg</span></p>
        )}
        {details.extraBottomSupport && (
          <p>Extra bot @ supp: 2 occ × {details.extraBottomSupport.zoneLen.toFixed(2)}m × {details.extraBottomSupport.count} × {member.extraBottomSupport.dia} × {details.extraBottomSupport.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.extraBottomSupport.weight.toFixed(2)} kg</span></p>
        )}
        {details.extraBottomMidspan && (
          <p>Extra bot @ mid: 1 occ × {details.extraBottomMidspan.zoneLen.toFixed(2)}m × {details.extraBottomMidspan.count} × {member.extraBottomMidspan.dia} × {details.extraBottomMidspan.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.extraBottomMidspan.weight.toFixed(2)} kg</span></p>
        )}
        {details.webBars && (
          <p>Web bars: {RM}m × {details.webBars.count} × {member.webBars.dia} × {details.webBars.kgm.toFixed(3)} × {wstMain} = <span className="text-cyan-400">{details.webBars.weight.toFixed(2)} kg</span></p>
        )}
      </div>

      {details.stirrups && (() => {
        const d = details.stirrups;
        return (
          <div className="border-t border-gray-700 pt-2 space-y-0.5">
            <p>Stirrup cut = 2×({member.width}−{cover2}) + 2×({member.depth}−{cover2}) + <EditParam value={settings.hookAllowance} unit="mm hook" step={10} onChange={(v) => upd('hook', v)} /> = {(d.cutLen * 1000).toFixed(0)}mm</p>
            {d.uniform ? (
              <>
                <p>No. links = ⌊{RM}×1000 / {d.spacing}⌋ + 1 = {d.numStir}</p>
                <p>Wt = {d.numStir} × {d.rings}R × {d.cutLen.toFixed(3)}m × {d.kgm.toFixed(3)} × {wstStir} = <span className="text-cyan-400">{d.weight.toFixed(2)} kg</span></p>
              </>
            ) : (
              <>
                <p className="text-gray-300">{d.rings} rings × {member.stirrups.dia} — constant for whole beam</p>
                <p>Zone = RM÷3 = {d.zoneLen.toFixed(2)}m</p>
                <p>Support ({d.suppSpacing}mm): {d.suppCount}/end × 2 ends = {d.totalSuppCount} stirrups → <span className="text-cyan-400">{d.suppWeight.toFixed(2)} kg</span></p>
                {d.midCount > 0 && (
                  <p>Midspan ({d.midSpacing}mm): {d.midCount} stirrups → <span className="text-cyan-400">{d.midWeight.toFixed(2)} kg</span></p>
                )}
                <p>Total: ({d.totalSuppCount}+{d.midCount}) × {d.rings}R × {d.cutLen.toFixed(3)}m × {d.kgm.toFixed(3)} × {wstStir} = <span className="text-cyan-400">{d.weight.toFixed(2)} kg</span></p>
              </>
            )}
          </div>
        );
      })()}

      <p className="border-t border-gray-700 pt-2 text-amber-300">Concrete = {member.width / 1000} × {member.depth / 1000} × {RM} = {result.concrete.toFixed(3)} m³</p>
      {(member.hasExtraTop || member.hasExtraBottom) && (
        <p className="text-gray-600">Extra bar zone = {details.zoneLen?.toFixed(2) ?? '—'}m ({member.extraBarLenOverride ? 'manual override' : 'RM ÷ 3'})</p>
      )}
    </div>
  );
}

function memberSummary(member) {
  const top = member.topBars ? `T${member.topBars.count}×${member.topBars.dia}` : '';
  const bot = member.bottomBars ? `B${member.bottomBars.count}×${member.bottomBars.dia}` : '';
  const stir = member.stirrups
    ? `${member.stirrups.rings}L-${member.stirrups.dia}@${member.stirrups.spacing}${member.hasMidspanStirrup && member.stirrupsMidspan?.spacing ? `/${member.stirrupsMidspan.spacing}` : ''}`
    : '';
  const extras = [
    member.hasExtraTop && 'extra top',
    member.hasExtraBottom && 'extra bot',
    member.hasWebBars && 'web',
  ].filter(Boolean).join(', ');
  return [top, bot, stir, extras].filter(Boolean).join(' | ');
}

export function BeamSection({ title, subtitle, members, addAction, updateAction, deleteAction, floorId }) {
  const { state, dispatch } = useApp();
  const { settings } = state;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showFormulas, setShowFormulas] = useState({});

  function saveMember(m) {
    const data = { ...m, id: m.id || uid() };
    dispatch({ type: editing ? updateAction : addAction, payload: floorId ? { floorId, member: data } : data });
    setShowModal(false); setEditing(null);
  }

  function updateRM(id, rm) {
    const member = members.find((m) => m.id === id);
    if (!member) return;
    dispatch({ type: updateAction, payload: floorId ? { floorId, member: { ...member, runningMeters: rm } } : { ...member, runningMeters: rm } });
  }

  function deleteMember(id) {
    dispatch({ type: deleteAction, payload: floorId ? { floorId, memberId: id } : id });
  }

  const totals = members.reduce((acc, m) => {
    const { steel, concrete } = calcBeam(m, settings);
    for (const [k, v] of Object.entries(steel)) acc.steel[k] = (acc.steel[k] || 0) + v;
    acc.concrete += concrete;
    return acc;
  }, { steel: {}, concrete: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <SaveButton />
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ Add Beam</button>
        </div>
      </div>

      {members.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          <p className="text-4xl mb-3">━</p>
          <p>No beams added yet.</p>
        </div>
      )}

      {members.map((member) => {
        const result = calcBeam(member, settings);
        const showF = showFormulas[member.id];

        return (
          <div key={member.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="badge bg-blue-900/50 text-blue-300">{member.name}</span>
                <span className="text-xs text-gray-500">{member.width}×{member.depth}mm</span>
                <span className="text-xs text-gray-600 font-mono">{memberSummary(member)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400 font-semibold">Running m:</label>
                  <input
                    type="number"
                    className="bg-gray-900 border border-gray-600 rounded-lg text-gray-100 text-center w-24 py-1.5 px-2 text-sm focus:outline-none focus:border-cyan-500"
                    value={member.runningMeters || 0}
                    min="0" step="0.5"
                    onChange={(e) => updateRM(member.id, +e.target.value)}
                  />
                </div>
                <button className="btn-ghost text-xs py-1 px-2" onClick={() => { setEditing(member); setShowModal(true); }}>Edit</button>
                <button className="btn-danger text-xs py-1 px-2" onClick={() => deleteMember(member.id)}><X className="w-3.5 h-3.5" /></button>
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">Section Total — {title}</p>
          <SteelBreakdown steel={totals.steel} concrete={totals.concrete} />
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Beam' : 'Add Beam'} onClose={() => { setShowModal(false); setEditing(null); }} wide>
          <BeamForm initial={editing || {}} onSave={saveMember} onClose={() => { setShowModal(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}
