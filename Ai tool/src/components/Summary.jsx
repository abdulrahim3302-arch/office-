import { BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { calcGrandSummary, totalKg } from '../utils/calculations.js';
import { BAR_TYPES } from '../utils/constants.js';
import { exportToExcel } from '../utils/export.js';

function PctBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

export function Summary() {
  const { state } = useApp();
  const { settings, project } = state;

  const summary = calcGrandSummary(state, settings);
  const { rows, grandSteel, grandConcrete } = summary;
  const grandKg = totalKg(grandSteel);
  const grandTons = grandKg / 1000;

  const steelDiaColors = {
    Y8: 'bg-sky-500', T10: 'bg-cyan-400', Y12: 'bg-blue-500',
    Y16: 'bg-indigo-500', Y20: 'bg-violet-500', T25: 'bg-purple-500', T32: 'bg-fuchsia-500',
  };

  function handleExport() {
    exportToExcel(state, settings, summary);
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Summary</h2>
        <div className="card text-center py-12 text-gray-500">
          <p className="flex justify-center mb-3"><BarChart3 className="w-10 h-10" /></p>
          <p>No data yet. Add members in each section to see the summary.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Grand Summary</h2>
          {project.name && (
            <p className="text-sm text-gray-400 mt-1">{project.name} · {project.client} · {project.location}</p>
          )}
        </div>
        <button className="btn-primary" onClick={handleExport}>
          ↓ Export to Excel
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Steel</div>
          <div className="total-val text-2xl">{grandKg.toFixed(0)}</div>
          <div className="text-xs text-gray-500">kg</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Steel</div>
          <div className="total-val text-2xl">{grandTons.toFixed(3)}</div>
          <div className="text-xs text-gray-500">tons</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Concrete</div>
          <div className="concrete-val text-2xl">{grandConcrete.toFixed(2)}</div>
          <div className="text-xs text-gray-500">m³</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Steel Ratio</div>
          <div className="text-emerald-400 font-mono font-bold text-2xl">
            {grandConcrete > 0 ? (grandKg / grandConcrete).toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-500">kg/m³</div>
        </div>
      </div>

      {/* Steel by diameter */}
      <div className="card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Steel by Diameter</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {BAR_TYPES.filter((d) => (grandSteel[d] || 0) > 0).map((dia) => (
            <div key={dia} className="bg-gray-900 rounded-xl p-3">
              <div className="text-xs font-bold mb-1 text-cyan-400">{dia}</div>
              <div className="steel-val text-lg">{(grandSteel[dia] || 0).toFixed(1)}</div>
              <div className="text-xs text-gray-600">kg</div>
              <PctBar value={grandSteel[dia] || 0} max={grandKg} color={steelDiaColors[dia] || 'bg-cyan-500'} />
            </div>
          ))}
        </div>
      </div>

      {/* Section breakdown table */}
      <div className="card overflow-x-auto">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Section Breakdown</h3>
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-semibold">Section</th>
              {BAR_TYPES.map((d) => (
                <th key={d} className="text-right py-2 px-2 text-gray-500 font-bold w-16">{d}</th>
              ))}
              <th className="text-right py-2 px-3 text-gray-400 font-semibold w-20">Total kg</th>
              <th className="text-right py-2 px-3 text-gray-400 font-semibold w-16">Tons</th>
              <th className="text-right py-2 px-3 text-amber-500 font-semibold w-24">Concrete m³</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const kg = totalKg(row.steel);
              return (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-700/20 transition-colors">
                  <td className="py-2 px-3 text-gray-300 font-medium">{row.label}</td>
                  {BAR_TYPES.map((d) => (
                    <td key={d} className="text-right py-2 px-2">
                      {(row.steel[d] || 0) > 0 ? (
                        <span className="steel-val">{(row.steel[d]).toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  ))}
                  <td className="text-right py-2 px-3 font-mono font-bold text-gray-200">{kg.toFixed(1)}</td>
                  <td className="text-right py-2 px-3 font-mono text-gray-400">{(kg / 1000).toFixed(3)}</td>
                  <td className="text-right py-2 px-3">
                    {(row.concrete || 0) > 0 ? (
                      <span className="concrete-val">{(row.concrete).toFixed(3)}</span>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-emerald-800 bg-emerald-900/10">
              <td className="py-3 px-3 text-emerald-400 font-bold text-sm">GRAND TOTAL</td>
              {BAR_TYPES.map((d) => (
                <td key={d} className="text-right py-3 px-2">
                  {(grandSteel[d] || 0) > 0 ? (
                    <span className="total-val font-bold">{(grandSteel[d]).toFixed(1)}</span>
                  ) : (
                    <span className="text-gray-700">—</span>
                  )}
                </td>
              ))}
              <td className="text-right py-3 px-3 total-val font-bold text-sm">{grandKg.toFixed(1)}</td>
              <td className="text-right py-3 px-3 total-val font-bold text-sm">{grandTons.toFixed(3)}</td>
              <td className="text-right py-3 px-3 concrete-val font-bold text-sm">{grandConcrete.toFixed(3)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Export note */}
      <div className="text-center text-xs text-gray-600 pb-4">
        Export includes separate sheets for each section plus this grand summary.
      </div>
    </div>
  );
}
