import { useApp } from '../../context/AppContext.jsx';

export function Blinding() {
  const { state, dispatch } = useApp();
  const volume = state.sections.blinding.volume;

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Blinding Concrete</h2>
        <p className="text-xs text-gray-500 mt-0.5">Lean mix concrete below footings. Input volume directly — no rebar.</p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label">Total Volume (m³)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="input-dark w-40 text-lg font-mono"
              value={volume}
              min="0"
              step="1"
              onChange={(e) => dispatch({ type: 'SET_BLINDING', payload: +e.target.value })}
            />
            <span className="text-gray-400 text-sm font-mono">m³</span>
          </div>
        </div>

        <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">▪</span>
          <div>
            <div className="text-sm font-semibold text-amber-300">Blinding Concrete</div>
            <div className="concrete-val text-xl">{(+volume || 0).toFixed(1)} m³</div>
          </div>
        </div>

        <p className="text-xs text-gray-500">Typical: ~30 m³ for a standard villa. Include all lean concrete under footings and grade beams.</p>
      </div>
    </div>
  );
}
