import { useState, useRef } from 'react';
import { useApp, uid } from '../context/AppContext.jsx';
import { extractSchedules, extractFloorPlanBeams, SCHEDULE_TYPES } from '../services/extract.js';
import { Modal } from './ui/Modal.jsx';

const API_KEY_LS = 'qs-gemini-key';

const SECTION_LABELS = {
  footingBoxes:  'Footing Boxes',
  stripFootings: 'Strip Footings',
  groundBeams:   'Ground Beams',
  columns:       'Columns',
  ringBeams:     'Ring Beams',
  floorBeams:    'Floor Beams',
  slabs:         'Slabs',
};

// floor key from Gemini → app floorData key
const FLOOR_ID_MAP = {
  ground: 'groundFloor',
  first:  'firstFloor',
  roof:   'roofFloor',
  second: 'secondFloor',
  third:  null,
};
const FLOOR_LABELS = {
  groundFloor: 'Ground Floor',
  firstFloor:  'First Floor',
  roofFloor:   'Roof Floor',
  secondFloor: 'Second Floor',
};

function normalizeMark(m) {
  return String(m).toUpperCase().replace(/[-\s]/g, '');
}

// ── Schedule preview line ─────────────────────────────────────────────────────
function MemberLine({ item, section }) {
  const dims = [];
  if (item.length && item.width && item.depth) dims.push(`${item.length}×${item.width}×${item.depth}mm`);
  else if (item.width && item.depth) dims.push(`${item.width}×${item.depth}mm`);
  else if (item.thickness) dims.push(`${item.thickness}mm thk`);

  const bars = [];
  if (section === 'footingBoxes') {
    if (item.bottomAlongL) bars.push(`BL: ${item.bottomAlongL.dia}@${item.bottomAlongL.spacing}`);
    if (item.bottomAlongW) bars.push(`BW: ${item.bottomAlongW.dia}@${item.bottomAlongW.spacing}`);
    if (item.topAlongL)    bars.push(`TL: ${item.topAlongL.dia}@${item.topAlongL.spacing}`);
    if (item.topAlongW)    bars.push(`TW: ${item.topAlongW.dia}@${item.topAlongW.spacing}`);
  } else if (section === 'columns') {
    if (item.vertBars)  bars.push(`${item.vertBars.count}×${item.vertBars.dia}`);
    if (item.stirrups)  bars.push(`Links: ${item.stirrups.rings || 1}R ${item.stirrups.dia}@${item.stirrups.spacing}`);
  } else if (['groundBeams', 'ringBeams', 'floorBeams'].includes(section)) {
    if (item.topBars)    bars.push(`T: ${item.topBars.count}${item.topBars.dia}`);
    if (item.bottomBars) bars.push(`B: ${item.bottomBars.count}${item.bottomBars.dia}`);
    if (item.stirrups)   bars.push(`Links: ${item.stirrups.rings || 1}R ${item.stirrups.dia}@${item.stirrups.spacing}`);
  } else if (section === 'stripFootings') {
    if (item.bottomAlongW) bars.push(`W: ${item.bottomAlongW.dia}@${item.bottomAlongW.spacing}`);
    if (item.bottomAlongL) bars.push(`L: ${item.bottomAlongL.dia}@${item.bottomAlongL.spacing}`);
  } else if (section === 'slabs') {
    if (item.layer1) bars.push(`L1: ${item.layer1.dia}@${item.layer1.spacing}`);
  }

  return (
    <div className="flex items-baseline gap-3 py-1 border-b border-gray-800/60 last:border-0">
      <span className="text-gray-200 font-bold text-xs w-10 flex-shrink-0">{item.name}</span>
      <span className="text-gray-500 text-xs">{dims.join(' ')}</span>
      <span className="text-cyan-400 text-xs ml-auto text-right">{bars.join('  ')}</span>
    </div>
  );
}

// ── Standard schedule confirmation modal ──────────────────────────────────────
function ConfirmModal({ extracted, onImport, onClose }) {
  const isBeamSchedule = extracted._scheduleType === 'ringBeam';
  const totalFound = Object.values(extracted).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);

  return (
    <Modal title="Review Extracted Members" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Gemini found <span className="text-cyan-300 font-bold">{totalFound} member type{totalFound !== 1 ? 's' : ''}</span>.
          Review below before importing. Qty / Running Meters will be set to 0 — enter those in each section.
        </p>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const items = extracted[key];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  {label} <span className="text-cyan-600 font-normal normal-case">({items.length})</span>
                </p>
                <div className="bg-gray-900 rounded-xl px-3 py-1">
                  {items.map((item, i) => (
                    <MemberLine key={i} item={item} section={key} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {totalFound === 0 && (
          <div className="text-center py-6 text-yellow-400">
            <p className="font-semibold">No members found in the extraction.</p>
            <p className="text-xs text-gray-500 mt-1">Try a higher-resolution image or select the correct schedule type.</p>
          </div>
        )}

        {isBeamSchedule ? (
          <p className="text-xs text-gray-600">
            Beam properties will be saved as a lookup table. Use Floor Plans extraction next to distribute beams into the correct floor tabs.
          </p>
        ) : (
          <p className="text-xs text-gray-600">
            Columns are added to all floors. Ground beams go to Ground Beams section. Qty / Running Meters stay at 0.
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40"
            disabled={totalFound === 0}
            onClick={onImport}
          >
            {isBeamSchedule ? 'Save Beam Schedule →' : 'Import to Project →'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Floor plan confirmation modal ─────────────────────────────────────────────
function FloorPlanConfirmModal({ floors, onImport, onClose }) {
  const totalBeams = Object.values(floors).reduce((s, arr) => s + arr.length, 0);

  return (
    <Modal title="Floor Plan Review — Ring Beams" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Matched <span className="text-cyan-300 font-bold">{totalBeams} beam{totalBeams !== 1 ? 's' : ''}</span> from
          floor plans against your beam schedule. Review per-floor breakdown below.
          Running Meters will be 0 — enter these in the Ring Beams tabs.
        </p>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {Object.entries(floors).map(([floorId, members]) => {
            if (!members.length) return null;
            return (
              <div key={floorId}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  {FLOOR_LABELS[floorId] || floorId}{' '}
                  <span className="text-cyan-600 font-normal normal-case">({members.length})</span>
                </p>
                <div className="bg-gray-900 rounded-xl px-3 py-1">
                  {members.map((item, i) => (
                    <MemberLine key={i} item={item} section="ringBeams" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {totalBeams === 0 && (
          <div className="text-center py-6 text-yellow-400">
            <p className="font-semibold">No beam marks from the floor plans matched the beam schedule.</p>
            <p className="text-xs text-gray-500 mt-1">Check that beam mark names in the floor plan match those in the schedule (e.g. B1 vs B-1).</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40"
            disabled={totalBeams === 0}
            onClick={onImport}
          >
            Import to Ring Beams →
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ScheduleUpload() {
  const { state, dispatch } = useApp();
  const EMPTY_FILES = { auto: [], footing: [], column: [], ringBeam: [], floorBeam: [], groundBeam: [], floorPlans: [] };
  const [filesByType, setFilesByType] = useState(EMPTY_FILES);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_LS) || '');
  const [scheduleType, setScheduleType] = useState('auto');
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);    // { _type: 'schedule', ...sections } or { _type: 'floorPlans', floors: {...} }
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  // Derived: files for the currently active schedule type tab
  const files = filesByType[scheduleType] ?? [];

  const addLog = msg => setLog(prev => [...prev, { msg, ok: msg.startsWith('✓'), err: msg.startsWith('✗') }]);

  function pickFiles(rawFiles) {
    const incoming = Array.from(rawFiles).filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    // Append into the active type's list, deduplicating by name+size
    setFilesByType(prev => {
      const current = prev[scheduleType] ?? [];
      const existing = new Set(current.map(f => `${f.name}|${f.size}`));
      return { ...prev, [scheduleType]: [...current, ...incoming.filter(f => !existing.has(`${f.name}|${f.size}`))] };
    });
    // Reset native input so the same file can be re-selected after removal
    if (inputRef.current) inputRef.current.value = '';
    setExtracted(null);
    setLog([]);
  }

  function removeFile(index) {
    setFilesByType(prev => ({ ...prev, [scheduleType]: (prev[scheduleType] ?? []).filter((_, i) => i !== index) }));
    setExtracted(null);
  }

  function clearFiles() {
    setFilesByType(prev => ({ ...prev, [scheduleType]: [] }));
    setExtracted(null);
    setLog([]);
  }

  async function handleExtract() {
    if (!files.length || loading) return;
    if (!apiKey.trim()) { alert('Enter your Google AI API key first.'); return; }

    localStorage.setItem(API_KEY_LS, apiKey.trim());
    setLoading(true);
    setLog([]);
    setExtracted(null);

    try {
      if (scheduleType === 'floorPlans') {
        // ── Floor plan mode: cross-reference with existing ring beam schedule ──

        // Beam library comes from the dedicated extractedBeamSchedule lookup,
        // NOT from ring beam floor tabs (those are output, not the source)
        const beamLibrary = state.extractedBeamSchedule || {};

        if (Object.keys(beamLibrary).length === 0) {
          addLog('✗ No beam schedule found. Switch to Ring Beams type → upload beam schedule → extract & save beam schedule first.');
          setLoading(false);
          return;
        }

        console.log('[QS] BEAM SCHEDULE LIBRARY (from state):', beamLibrary);
        addLog(`Beam library: ${Object.keys(beamLibrary).length} unique marks available (${Object.keys(beamLibrary).join(', ')})`);

        // Call Gemini with floor plan prompt
        const floorBeamMarks = await extractFloorPlanBeams(files, apiKey.trim(), addLog);
        console.log('[QS] FLOOR PLAN RESULT from Gemini:', floorBeamMarks);

        // Cross-reference marks → full member objects per floor
        const floors = {};
        let skipped = 0;
        for (const [floorKey, marks] of Object.entries(floorBeamMarks)) {
          const floorId = FLOOR_ID_MAP[floorKey];
          if (!floorId) {
            console.warn(`[QS] Unknown floor key from Gemini: "${floorKey}" — skipping. Known keys: ${Object.keys(FLOOR_ID_MAP).join(', ')}`);
            addLog(`⚠ Gemini returned unknown floor key "${floorKey}" — skipped`);
            continue;
          }

          const matched = [];
          for (const mark of marks) {
            const key = normalizeMark(mark);
            const template = beamLibrary[key];
            console.log(`[QS] CROSS REF — floor: "${floorKey}" → "${floorId}", mark: "${mark}" (normalized: "${key}"), found: ${!!template}`);
            if (template) {
              matched.push({ ...template, id: uid(), runningMeters: 0 });
            } else {
              addLog(`⚠ Mark "${mark}" from floor plan not found in beam schedule`);
              skipped++;
            }
          }
          if (matched.length > 0) {
            floors[floorId] = matched;
            console.log(`[QS] POPULATING RING BEAMS — floor: "${floorId}", beams:`, matched.map(m => m.name));
          }
        }

        const totalMatched = Object.values(floors).reduce((s, arr) => s + arr.length, 0);
        addLog(`✓ Matched ${totalMatched} beam${totalMatched !== 1 ? 's' : ''} across ${Object.keys(floors).length} floor${Object.keys(floors).length !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} mark${skipped !== 1 ? 's' : ''} not found in schedule)` : ''}`);

        setExtracted({ _type: 'floorPlans', floors });

      } else {
        // ── Normal schedule extraction ──
        const result = await extractSchedules(files, apiKey.trim(), addLog, scheduleType);
        if (scheduleType === 'ringBeam') {
          console.log('[QS] BEAM SCHEDULE EXTRACTED:', result.ringBeams);
        }
        const total = Object.values(result).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
        addLog(`✓ Done — ${total} member type${total !== 1 ? 's' : ''} found`);
        // Tag with _scheduleType so handleImport can branch correctly
        setExtracted({ _type: 'schedule', _scheduleType: scheduleType, ...result });
      }
    } catch (err) {
      addLog(`✗ ${err.message}`);
    }
    setLoading(false);
  }

  function handleImport() {
    if (!extracted) return;

    if (extracted._type === 'floorPlans') {
      // Replace each floor tab's members (clears old data, no duplicates on re-run)
      const summary = [];
      for (const [floorId, members] of Object.entries(extracted.floors)) {
        dispatch({ type: 'REPLACE_RING_BEAM_FLOOR', payload: { floorId, members } });
        summary.push(`${members.length} to ${FLOOR_LABELS[floorId] || floorId}`);
      }
      dispatch({ type: 'SET_ACTIVE_SECTION', payload: 'ringBeams' });
      console.log(`[QS] Floor plan import: ${summary.join(', ')}`);

    } else if (extracted._scheduleType === 'ringBeam') {
      // Save ring beam schedule as lookup table — do NOT write to any floor tab
      const schedule = {};
      for (const member of (extracted.ringBeams || [])) {
        if (member.name) schedule[normalizeMark(member.name)] = member;
      }
      dispatch({ type: 'SET_EXTRACTED_BEAM_SCHEDULE', payload: schedule });
      addLog(`✓ Beam schedule saved (${Object.keys(schedule).length} marks). Now extract Floor Plans to distribute per floor.`);

    } else {
      // All other types: standard import
      // eslint-disable-next-line no-unused-vars
      const { _type, _scheduleType, ...scheduleData } = extracted;
      dispatch({ type: 'IMPORT_SCHEDULE', payload: scheduleData });
      dispatch({ type: 'SET_ACTIVE_SECTION', payload: 'footingBoxes' });
    }

    setExtracted(null);
  }

  const isFloorPlans = scheduleType === 'floorPlans';
  const selectedType = SCHEDULE_TYPES.find(t => t.id === scheduleType);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-xs font-black text-white">AI</div>
        <div>
          <h3 className="text-sm font-bold text-gray-200">Extract Schedule with Gemini AI</h3>
          <p className="text-xs text-gray-500">Upload drawing PDFs or images → AI reads the schedules → sections auto-fill</p>
        </div>
      </div>

      {/* API key */}
      <div>
        <label className="label">Google AI API Key</label>
        <input
          type="password"
          className="input-dark text-sm font-mono"
          placeholder="AIzaSy..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
        <p className="text-xs text-gray-600 mt-1">Saved locally. Get yours free at aistudio.google.com → Get API key</p>
      </div>

      {/* Schedule type selector */}
      <div>
        <label className="label">Schedule Type</label>
        <div className="flex flex-wrap gap-1.5">
          {SCHEDULE_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                scheduleType === t.id
                  ? 'bg-violet-900/50 border-violet-600 text-violet-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
              }`}
              onClick={() => setScheduleType(t.id)}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {scheduleType === 'auto'
            ? 'AI will attempt to extract all section types from the uploaded drawings.'
            : isFloorPlans
            ? 'AI reads beam marks from each floor plan page and maps them to Ring Beam floor tabs using your already-extracted beam schedule as the source of beam properties.'
            : `AI will focus on ${selectedType?.label} only — gives more accurate results.`}
        </p>
        {isFloorPlans && (
          <div className="mt-2 px-3 py-2 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300">
            <span className="font-semibold">Step 1 first:</span> Switch to Ring Beams type → upload beam schedule drawings → extract &amp; import. Then come back here for Step 2 (floor plans).
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-cyan-500 bg-cyan-900/20'
            : files.length
            ? 'border-gray-600 bg-gray-800/60'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); pickFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,image/*" multiple onChange={e => pickFiles(e.target.files)} />
        {files.length === 0 ? (
          <>
            <div className="text-3xl mb-2">{isFloorPlans ? '🗺' : '📐'}</div>
            <p className="text-sm text-gray-300 font-medium">Drop PDFs or images here</p>
            <p className="text-xs text-gray-500 mt-1">
              {isFloorPlans
                ? 'Ground floor plan · First floor plan · Roof floor plan'
                : 'Footing schedule · Column schedule · Beam schedule'}
            </p>
          </>
        ) : (
          <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs text-gray-400 font-semibold">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
              <button
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                onClick={clearFiles}
              >
                Clear all
              </button>
            </div>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-300 bg-gray-900/60 rounded-lg px-3 py-1.5">
                <span>{f.type === 'application/pdf' ? '📄' : '🖼'}</span>
                <span className="font-medium flex-1 truncate text-left">{f.name}</span>
                <span className="text-gray-600 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                <button
                  className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 ml-1 leading-none"
                  onClick={() => removeFile(i)}
                  title="Remove file"
                >×</button>
              </div>
            ))}
            <button
              className="text-xs text-violet-600 hover:text-violet-400 transition-colors mt-0.5 w-full text-center py-1 border border-dashed border-gray-700 rounded-lg hover:border-gray-600"
              onClick={() => inputRef.current?.click()}
            >
              + Add more files
            </button>
          </div>
        )}
      </div>

      {/* Extract button */}
      <button
        className={`w-full justify-center py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
          files.length && !loading
            ? 'bg-gradient-to-r from-violet-700 to-cyan-700 hover:from-violet-600 hover:to-cyan-600 text-white cursor-pointer'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
        disabled={!files.length || loading}
        onClick={handleExtract}
      >
        {loading
          ? <><span className="animate-spin">⟳</span> {isFloorPlans ? 'Reading floor plans...' : 'Extracting schedules...'}</>
          : <><span>✦</span> {isFloorPlans ? 'Extract Floor Plans' : 'Extract with Gemini AI'}</>
        }
      </button>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-0.5">
          {log.map((entry, i) => (
            <div key={i} className={`text-xs font-mono ${entry.ok ? 'text-emerald-400' : entry.err ? 'text-red-400' : 'text-gray-400'}`}>
              {entry.msg}
            </div>
          ))}
          {loading && <div className="text-xs text-gray-600 animate-pulse">...</div>}
        </div>
      )}

      {/* Confirmation modals */}
      {extracted?._type === 'floorPlans' && (
        <FloorPlanConfirmModal
          floors={extracted.floors}
          onImport={handleImport}
          onClose={() => setExtracted(null)}
        />
      )}
      {extracted?._type === 'schedule' && (
        <ConfirmModal
          extracted={extracted}
          onImport={handleImport}
          onClose={() => setExtracted(null)}
        />
      )}
    </div>
  );
}
