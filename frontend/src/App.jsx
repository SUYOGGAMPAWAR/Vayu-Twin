import React, { useState } from 'react';
import { Activity, Map as MapIcon, Server, AlertTriangle, CloudRain, CheckCircle, Clock, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pipelineStatus, setPipelineStatus] = useState('idle');
  const [hoveredCity, setHoveredCity] = useState(null);

  const hotspotData = [
    { city: 'Delhi', aqi: 185, risk: 'High', vcd: 0.000185, lat: 28.6139, lng: 77.2090 },
    { city: 'Kanpur', aqi: 162, risk: 'High', vcd: 0.000162, lat: 26.4499, lng: 80.3319 },
    { city: 'Kolkata', aqi: 140, risk: 'Moderate', vcd: 0.000140, lat: 22.5726, lng: 88.3639 },
    { city: 'Mumbai', aqi: 110, risk: 'Moderate', vcd: 0.000110, lat: 19.0760, lng: 72.8777 },
    { city: 'Chennai', aqi: 85, risk: 'Low', vcd: 0.000085, lat: 13.0827, lng: 80.2707 },
    { city: 'Bengaluru', aqi: 60, risk: 'Low', vcd: 0.000060, lat: 12.9716, lng: 77.5946 },
  ];

  const getRiskColor = (aqi) => {
    if (aqi > 150) return { fill: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' };
    if (aqi > 100) return { fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' };
    return { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' };
  };

  const simulatePipelineRun = () => {
    setPipelineStatus('running');
    setTimeout(() => setPipelineStatus('ingesting'), 1000);
    setTimeout(() => setPipelineStatus('inference'), 3000);
    setTimeout(() => setPipelineStatus('success'), 5000);
    setTimeout(() => setPipelineStatus('idle'), 8000);
  };

  const mapLngToX = (lng) => ((lng - 68) / (97 - 68)) * 100;
  const mapLatToY = (lat) => ((37 - lat) / (37 - 8)) * 100;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col z-20 shadow-xl">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-sky-400 flex items-center gap-2">
            <CloudRain className="w-6 h-6" />
            VayuTwin
          </h1>
          <p className="text-xs text-slate-400 mt-1">ISRO Hackathon • PS-05</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'hover:bg-slate-700/50 text-slate-300'}`}
          >
            <Activity className="w-5 h-5" /> Live Hotspots
          </button>
          <button 
            onClick={() => setActiveTab('pipeline')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pipeline' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'hover:bg-slate-700/50 text-slate-300'}`}
          >
            <Server className="w-5 h-5" /> MLOps Pipeline
          </button>
        </nav>

        <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-sm">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>System Status</span>
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Online</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Last Sync</span>
            <span>02:00 AM IST</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 relative">
        <header className="mb-8 flex justify-between items-end relative z-10">
          <div>
            <h2 className="text-3xl font-bold">HCHO Surface Concentration</h2>
            <p className="text-slate-400 mt-2">AI-Predicted AQI derived from Sentinel-5P VCD Satellite Data</p>
          </div>
          <button 
            onClick={simulatePipelineRun}
            disabled={pipelineStatus !== 'idle'}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg"
          >
            {pipelineStatus !== 'idle' ? <Clock className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            {pipelineStatus !== 'idle' ? 'Pipeline Running...' : 'Force Manual Run'}
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Critical Hotspots</p>
                    <h3 className="text-4xl font-bold text-red-400 mt-2">2</h3>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-400 opacity-50" />
                </div>
                <p className="text-xs text-slate-500 mt-4">Cities exceeding 150 HCHO AQI</p>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Data Points Analyzed</p>
                    <h3 className="text-4xl font-bold text-sky-400 mt-2">24.5M</h3>
                  </div>
                  <MapIcon className="w-8 h-8 text-sky-400 opacity-50" />
                </div>
                <p className="text-xs text-slate-500 mt-4">Across Indian subcontinent</p>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Model Accuracy</p>
                    <h3 className="text-4xl font-bold text-emerald-400 mt-2">92.4%</h3>
                  </div>
                  <Activity className="w-8 h-8 text-emerald-400 opacity-50" />
                </div>
                <p className="text-xs text-slate-500 mt-4">Compared to CPCB Ground Truth</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg lg:col-span-2 relative min-h-[450px]">
                <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
                  Live HCHO Heatmap (India)
                  <span className="text-xs font-normal text-slate-400 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700"><Info className="w-3 h-3"/> Radar Telemetry</span>
                </h3>
                
                <div className="absolute inset-0 top-[70px] bottom-6 left-6 right-6 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                  
                  <div className="relative w-full h-full max-w-[500px] max-h-[500px] mx-auto mt-4">
                    <svg viewBox="-5 -5 110 110" className="absolute inset-0 w-full h-full overflow-visible">
                      <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      <polygon 
                        points="27,0 29,1 30,0 32,1 34,4 35,7 34,12 36,15 38,18 40,20 45,23 48,25 52,27 55,29 60,31 63,30 66,29 68,27 70,26 72,24 74,27 76,29 80,30 83,28 86,25 90,22 95,20 98,22 100,26 98,32 96,38 94,42 92,46 90,52 88,58 85,53 82,50 79,48 76,46 72,48 68,52 66,56 64,59 60,63 56,67 52,72 48,77 45,82 42,87 38,93 35,97 33,100 30,98 27,93 25,88 23,83 20,77 18,72 16,67 14,62 12,57 10,52 8,48 4,48 1,46 0,44 2,41 6,39 8,36 5,34 7,30 10,27 14,23 18,19 20,15 22,10 24,5 26,2" 
                        fill="#1e293b" 
                        stroke="#38bdf8" 
                        strokeWidth="0.8" 
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_8px_rgba(56,189,248,0.3)] transition-all duration-500"
                      />
                      
                      {hotspotData.map((point, idx) => {
                        const x = mapLngToX(point.lng);
                        const y = mapLatToY(point.lat);
                        const { fill, glow } = getRiskColor(point.aqi);
                        const size = Math.max(1.5, point.aqi / 40); 

                        return (
                          <g 
                            key={idx} 
                            transform={`translate(${x}, ${y})`}
                            onMouseEnter={() => setHoveredCity(point)}
                            onMouseLeave={() => setHoveredCity(null)}
                            className="cursor-pointer transition-transform hover:scale-110"
                          >
                            <circle cx="0" cy="0" r={size * 2} fill={glow} className="animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                            <circle cx="0" cy="0" r={size * 1.5} fill={glow} opacity="0.6" filter="url(#glow)" />
                            <circle cx="0" cy="0" r={size} fill={fill} stroke="#fff" strokeWidth="0.5" />
                            <text x={size + 2} y="1" fill="#cbd5e1" fontSize="3.5" fontFamily="sans-serif" className="pointer-events-none drop-shadow-md font-medium">{point.city}</text>
                          </g>
                        );
                      })}
                    </svg>

                    {hoveredCity && (
                      <div 
                        className="absolute bg-slate-900 border border-slate-600 p-3 rounded-lg shadow-2xl pointer-events-none z-50 transition-all duration-200"
                        style={{
                          left: `${mapLngToX(hoveredCity.lng)}%`,
                          top: `${mapLatToY(hoveredCity.lat)}%`,
                          transform: 'translate(-50%, -120%)'
                        }}
                      >
                        <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-100">{hoveredCity.city}</p>
                        <p className="text-xs text-slate-400 mt-1">AQI: <span className="font-semibold text-slate-200">{hoveredCity.aqi}</span></p>
                        <p className="text-xs text-slate-400">Status: <span className={`font-semibold ${hoveredCity.risk === 'High' ? 'text-red-400' : hoveredCity.risk === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'}`}>{hoveredCity.risk}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <h3 className="text-lg font-bold mb-6">Highest Risk Zones</h3>
                <div className="space-y-4">
                  {hotspotData.filter(d => d.aqi > 100).sort((a,b) => b.aqi - a.aqi).map((city, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-slate-700/50 hover:border-slate-500 transition-colors cursor-pointer"
                      onMouseEnter={() => setHoveredCity(city)}
                      onMouseLeave={() => setHoveredCity(null)}
                    >
                      <div>
                        <p className="font-medium">{city.city}</p>
                        <p className={`text-xs ${city.risk === 'High' ? 'text-red-400' : 'text-amber-400'}`}>
                          {city.risk} Risk
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{city.aqi}</p>
                        <p className="text-[10px] text-slate-500">AQI</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="max-w-4xl mx-auto space-y-6 relative z-10">
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center shadow-lg">
              <Server className="w-16 h-16 text-sky-400 mx-auto mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">Kubernetes Pipeline Monitor</h3>
              <p className="text-slate-400 max-w-lg mx-auto">
                Watch the MLOps pipeline pull raw VCD data from Google Earth Engine, run the Random Forest inference model, and push the GeoJSON out.
              </p>
            </div>

            <div className="space-y-4">
              <PipelineStep 
                number="1"
                title="Data Ingestion (Google Earth Engine)"
                desc="Fetching Sentinel-5P TROPOMI HCHO offline datasets."
                status={pipelineStatus === 'ingesting' ? 'active' : (['inference', 'success'].includes(pipelineStatus) ? 'done' : 'waiting')}
              />
              <PipelineStep 
                number="2"
                title="ML Inference (Docker Pod)"
                desc="Applying meteorological weights and running prediction algorithms."
                status={pipelineStatus === 'inference' ? 'active' : (pipelineStatus === 'success' ? 'done' : 'waiting')}
              />
              <PipelineStep 
                number="3"
                title="Formatting & Export"
                desc="Converting output to GeoJSON and updating the database."
                status={pipelineStatus === 'success' ? 'done' : 'waiting'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineStep({ number, title, desc, status }) {
  let borderClass = "border-slate-700 bg-slate-800";
  let textClass = "text-slate-300";
  let iconClass = "bg-slate-700 text-slate-400";

  if (status === 'active') {
    borderClass = "border-sky-500 bg-sky-900/20";
    textClass = "text-sky-400 font-bold";
    iconClass = "bg-sky-500 text-white animate-pulse";
  } else if (status === 'done') {
    borderClass = "border-emerald-500/50 bg-emerald-900/10";
    textClass = "text-emerald-400";
    iconClass = "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]";
  }

  return (
    <div className={`p-5 rounded-xl border transition-all duration-500 flex items-start gap-4 shadow-lg ${borderClass}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors duration-500 ${iconClass}`}>
        {status === 'done' ? <CheckCircle className="w-4 h-4" /> : number}
      </div>
      <div>
        <h4 className={`text-lg mb-1 transition-colors duration-500 ${textClass}`}>{title}</h4>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}