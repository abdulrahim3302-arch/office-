import { BAR_TYPES } from '../../utils/constants.js';

export function SteelBreakdown({ steel = {}, concrete = 0, compact = false }) {
  const totalKg = Object.values(steel).reduce((s, v) => s + v, 0);
  const activeDias = BAR_TYPES.filter((d) => (steel[d] || 0) > 0.01);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 items-center">
        {activeDias.map((dia) => (
          <div key={dia} className="text-xs">
            <span className="text-gray-500">{dia}: </span>
            <span className="steel-val">{steel[dia].toFixed(1)}<span className="text-gray-600"> kg</span></span>
          </div>
        ))}
        {totalKg > 0 && (
          <div className="text-xs font-bold">
            <span className="text-gray-400">Total: </span>
            <span className="total-val">{totalKg.toFixed(1)} kg</span>
          </div>
        )}
        {concrete > 0 && (
          <div className="text-xs">
            <span className="text-gray-500">Conc: </span>
            <span className="concrete-val">{concrete.toFixed(3)} m³</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeDias.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Steel by Diameter</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {activeDias.map((dia) => (
              <div key={dia} className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-500 font-bold">{dia}</div>
                <div className="steel-val text-sm">{steel[dia].toFixed(1)}</div>
                <div className="text-xs text-gray-600">kg</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-4 items-center pt-1">
        <div>
          <span className="text-xs text-gray-500">Total Steel: </span>
          <span className="total-val text-sm">{totalKg.toFixed(1)} kg</span>
          <span className="text-xs text-gray-600 ml-1">({(totalKg / 1000).toFixed(3)} t)</span>
        </div>
        {concrete > 0 && (
          <div>
            <span className="text-xs text-gray-500">Concrete: </span>
            <span className="concrete-val text-sm">{concrete.toFixed(3)} m³</span>
          </div>
        )}
      </div>
    </div>
  );
}
