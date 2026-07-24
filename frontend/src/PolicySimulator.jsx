import React from 'react';

export default function PolicySimulator({
  trafficReduction = 0,
  setTrafficReduction,
  industrialReduction = 0,
  setIndustrialReduction,
}) {
  const combinedImpact = Math.round(trafficReduction * 0.35 + industrialReduction * 0.25);

  const handleReset = () => {
    if (setTrafficReduction) setTrafficReduction(0);
    if (setIndustrialReduction) setIndustrialReduction(0);
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-white">Policy Scenario Simulator</h3>
          <div className="flex items-center gap-2">
            {(trafficReduction > 0 || industrialReduction > 0) && (
              <button
                onClick={handleReset}
                className="text-[10px] text-slate-400 hover:text-white underline transition-colors"
              >
                Reset
              </button>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
              Digital Twin
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Simulate environmental policy levers to forecast regional VOC/HCHO mitigation.
        </p>

        {/* Traffic / EV Slider */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">EV Adoption / Traffic -%</span>
            <span className="text-blue-400 font-semibold">-{trafficReduction}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={trafficReduction}
            onChange={(e) => setTrafficReduction && setTrafficReduction(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Industrial VOC Abatement Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">Industrial VOC Abatement</span>
            <span className="text-emerald-400 font-semibold">-{industrialReduction}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={industrialReduction}
            onChange={(e) => setIndustrialReduction && setIndustrialReduction(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
        <span className="text-slate-400">Forecasted AQI Offset:</span>
        <span className={`font-bold ${combinedImpact > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
          -{combinedImpact}% Regional AQI
        </span>
      </div>
    </div>
  );
}
