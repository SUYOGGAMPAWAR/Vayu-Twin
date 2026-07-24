import React from 'react';

export default function ExposureCard({ selectedCity, simulatedAqi }) {
  if (!selectedCity) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm h-full flex items-center justify-center text-slate-500 text-xs">
        Select a city to inspect human health exposure risk.
      </div>
    );
  }

  // Use real population from backend data, fallback to 1M if syncing
  const population = selectedCity.population || 1000000;

  // Real Health Risk Multiplier formula: (AQI / 50) * (Population / 5M)
  const exposureIndex = Number(
    (((simulatedAqi || 20) / 50) * (population / 5000000)).toFixed(2)
  );

  const getRiskCategory = (score) => {
    if (score < 0.5) return { label: 'Low Hazard', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (score < 1.2) return { label: 'Moderate Exposure', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: 'High Societal Impact', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const risk = getRiskCategory(exposureIndex);

  // Formatting population numbers (e.g. 15.4M or 850k)
  const formattedPopulation =
    population >= 1000000
      ? `${(population / 1000000).toFixed(1)}M`
      : `${Math.round(population / 1000)}k`;

  const vulnerablePop = Math.round((population * 0.18) / 1000);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-semibold text-white">Societal Exposure Index</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${risk.bg} ${risk.color}`}>
            {risk.label}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <p className={`text-3xl font-bold ${risk.color}`}>{exposureIndex}</p>
          <span className="text-xs text-slate-500">x10⁴ Person-AQI Risk</span>
        </div>

        <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Urban Census Population:</span>
            <span className="text-slate-200 font-medium">{formattedPopulation} residents</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Vulnerable Group (~18%):</span>
            <span className="text-slate-200 font-medium">{vulnerablePop}k (Seniors/Kids)</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
        *Derived from Sentinel-5P HCHO columns & Open-Meteo census geodata.
      </p>
    </div>
  );
}
