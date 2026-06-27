import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { extractSchedules } from '../services/extract.js';

const API_KEY_LS = 'qs-gemini-key';

const SECTION_LABELS = {
  footingBoxes: 'Footing Boxes',
  stripFootings: 'Strip Footings',
  groundBeams: 'Ground Beams',
  columns: 'Columns',
  ringBeams: 'Ring Beams',
  floorBeams: 'Floor Beams',
  slabs: 'Slabs',
};

export function ScheduleUpload() {
  const { dispatch } = useApp();
  const [files, setFiles] = useState([]);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_LS) || '');
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addLog = (msg) => setLog(prev => [...prev, { msg, ok: msg.startsWith('✓'), err: msg.startsWith('✗') }]);

  function pickFiles(rawFiles) {
    const valid = Array.from(rawFiles).filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    setFiles(valid);
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
      const result = await extractSchedules(files, apiKey.trim(), (msg) => addLog(msg));
      setExtracted(result);
      const total = Object.values(result).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
      addLog(`✓ Done — ${total} member type${total !== 1 ? 's' : ''} found`);
    } catch (err) {
      addLog(`✗ ${err.message}`);
    }
    setLoading(false);
  }

  function handleImport() {
    if (!extracted) return;
    dispatch({ type: 'IMPORT_SCHEDULE', payload: extracted });
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: 'footingBoxes' });
  }

  const counts = extracted
    ? Object.fromEntries(Object.keys(SECTION_LABELS).map(k => [k, extracted[k]?.length || 0]))
    : null;
  const totalFound = counts ? Object.values(counts).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-xs font-black text-white">AI</div>
        <div>
          <h3 className="text-sm font-bold text-gray-200">Extract Schedule with AI</h3>
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
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,image/*"
          multiple
          onChange={e => pickFiles(e.target.files)}
        />
        {files.length === 0 ? (
          <>
            <div className="text-3xl mb-2">📐</div>
            <p className="text-sm text-gray-300 font-medium">Drop PDFs or images here</p>
            <p className="text-xs text-gray-500 mt-1">Footing schedule · Column schedule · Beam schedule</p>
          </>
        ) : (
          <div className="space-y-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-gray-300 bg-gray-900/60 rounded-lg px-3 py-1.5">
                <span className="flex items-center gap-2">
                  <span>{f.type === 'application/pdf' ? '📄' : '🖼'}</span>
                  <span className="font-medium">{f.name}</span>
                </span>
                <span className="text-gray-500">{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
            <button
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors mt-1"
              onClick={e => { e.stopPropagation(); setFiles([]); setExtracted(null); setLog([]); }}
            >
              × Clear
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
        {loading ? (
          <><span className="animate-spin">⟳</span> Extracting schedules...</>
        ) : (
          <><span>✦</span> Extract with Gemini AI</>
)}
      </button>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-0.5">
          {log.map((entry, i) => (
            <div
              key={i}
              className={`text-xs font-mono ${
                entry.ok ? 'text-emerald-400' : entry.err ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {entry.msg}
            </div>
          ))}
          {loading && <div className="text-xs text-gray-600 animate-pulse">...</div>}
        </div>
      )}

      {/* Results */}
      {extracted && totalFound > 0 && (
        <div className="bg-gray-800 border border-emerald-800/40 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-400">✓ {totalFound} member type{totalFound !== 1 ? 's' : ''} extracted</p>
              <p className="text-xs text-gray-500 mt-0.5">Review below, then import to populate all sections</p>
            </div>
            <button
              className="btn-primary bg-emerald-700 hover:bg-emerald-600"
              onClick={handleImport}
            >
              → Import to Project
            </button>
          </div>

          {/* Count pills */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-center min-w-[80px]">
                <div className="text-base font-bold text-cyan-400">{v}</div>
                <div className="text-xs text-gray-500">{SECTION_LABELS[k]}</div>
              </div>
            ))}
          </div>

          {/* Member name preview per section */}
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const items = extracted[key];
            if (!items?.length) return null;
            return (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((item, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs">
                      <span className="font-bold text-gray-200">{item.name}</span>
                      {item.width && item.depth && (
                        <span className="text-gray-500 ml-1.5">{item.width}×{item.depth}{item.length ? `×${item.length}` : ''}mm</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <p className="text-xs text-gray-600">
            Columns are added to all floors with qty=0. Beams and ring beams go to Ground Floor. Enter quantities in each section.
          </p>
        </div>
      )}

      {extracted && totalFound === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 text-center">
          <p className="text-sm text-yellow-400 font-semibold">No members found</p>
          <p className="text-xs text-gray-400 mt-1">Ensure schedule tables are clearly visible. Try a higher-resolution scan or closer crop.</p>
        </div>
      )}
    </div>
  );
}
